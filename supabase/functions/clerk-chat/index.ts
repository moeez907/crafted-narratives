import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Feature Hashing — same algorithm as seed-products to generate query embeddings.
 * Produces deterministic 384-dim vectors for cosine similarity search in pgvector.
 */
function generateHashEmbedding(text: string, dim = 384): number[] {
  const vector = new Array(dim).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) + hash + word.charCodeAt(i);
      hash = hash & hash;
    }
    const idx = Math.abs(hash) % dim;
    const sign = (Math.abs(hash >> 8) % 2) === 0 ? 1 : -1;
    vector[idx] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  return vector;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- RAG RETRIEVAL PIPELINE ---
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop()?.content || "";

    let retrievedProducts: any[] = [];

    // Step 1: Vector similarity search using pgvector embeddings
    try {
      const queryEmbedding = generateHashEmbedding(lastUserMessage);
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      const { data: vectorResults, error: vecError } = await supabase.rpc("match_products", {
        query_embedding: embeddingStr,
        match_threshold: 0.05,
        match_count: 10,
      });

      if (vecError) {
        console.warn("Vector search error:", vecError);
      } else if (vectorResults && vectorResults.length > 0) {
        retrievedProducts = vectorResults;
        console.log(
          `RAG: Vector search returned ${vectorResults.length} products (similarities: ${vectorResults.map((p: any) => p.similarity?.toFixed(3)).join(", ")})`
        );
      }
    } catch (embErr) {
      console.warn("Vector search failed:", embErr);
    }

    // Step 2: Text search fallback if vector search returned < 3 results
    if (retrievedProducts.length < 3) {
      const searchTerms = lastUserMessage
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (w: string) =>
            w.length > 2 &&
            !["the", "and", "for", "that", "this", "with", "are", "was", "have", "can", "you", "your", "need", "want", "something", "looking"].includes(w)
        );

      for (const term of searchTerms.slice(0, 6)) {
        const { data: textResults } = await supabase.rpc("search_products_by_text", {
          search_query: term,
          match_count: 5,
        });
        if (textResults) {
          retrievedProducts.push(...textResults);
        }
      }

      // Deduplicate
      retrievedProducts = Array.from(
        new Map(retrievedProducts.map((p: any) => [p.id, p])).values()
      );
      console.log(`RAG: Combined search returned ${retrievedProducts.length} products`);
    }

    // Step 2.5: Category-based fallback — guarantee category products are included
    const categoryKeywords = ["trousers", "shoes", "bags", "watches", "shirts", "suits", "blazers", "dresses", "knitwear", "outerwear", "accessories"];
    const userWords = lastUserMessage.toLowerCase().split(/\s+/);
    const matchedCategory = categoryKeywords.find(cat => userWords.some(w => w.includes(cat) || cat.includes(w)));

    if (matchedCategory) {
      const categoryInResults = retrievedProducts.filter((p: any) =>
        p.category?.toLowerCase().includes(matchedCategory)
      ).length;

      if (categoryInResults < 3) {
        const { data: categoryProducts } = await supabase.rpc("search_products_by_text", {
          search_query: matchedCategory,
          match_count: 20,
        });
        if (categoryProducts) {
          retrievedProducts.push(...categoryProducts);
          retrievedProducts = Array.from(
            new Map(retrievedProducts.map((p: any) => [p.id, p])).values()
          );
          console.log(`RAG: Category fallback for "${matchedCategory}" added, total: ${retrievedProducts.length}`);
        }
      }
    }

    // Step 3: Always fetch ALL products as full catalog context
    // The clerk should ALWAYS have visibility into the entire inventory
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, description, price, bottom_price, category, tags, colors, sizes, rating, reviews, in_stock, stock_count")
      .limit(250);

    const fullCatalog = allProducts || [];

    // Build context: highlighted (RAG-matched) products + full catalog
    const matchedIds = new Set(retrievedProducts.map((p: any) => p.id));

    const productsContext = JSON.stringify(
      fullCatalog.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        bottomPrice: p.bottom_price,
        category: p.category,
        tags: p.tags,
        colors: p.colors,
        sizes: p.sizes,
        rating: p.rating,
        reviews: p.reviews,
        inStock: p.in_stock,
        stockCount: p.stock_count,
        relevance: matchedIds.has(p.id) ? "HIGH — matched by RAG search" : "available",
      }))
    );

    const systemPrompt = `You are "The Clerk" — a charming, witty, and incredibly helpful AI personal shopper at LUXE BOUTIQUE, a premium fashion store. You have a warm personality with a touch of humor. Think of yourself as a knowledgeable friend who happens to have impeccable taste.

## Your Personality:
- Friendly, warm, slightly witty — like a real boutique shopkeeper
- Confident in your recommendations
- You use occasional fashion vocabulary but keep it accessible
- You're never condescending

## Full Product Inventory (dynamically loaded from database via RAG pipeline):
${productsContext}

Products marked with "relevance: HIGH" were matched by the vector similarity search (pgvector/ChromaDB) against the user's query. Prioritize recommending these, but you have access to the FULL catalog and can recommend any product.

## Your Capabilities:

### 1. Semantic Search & Accuracy — CRITICAL RULE
When users ask for a SPECIFIC product type (e.g., "trousers", "leather jacket"), you MUST:
- ONLY recommend products whose category, name, description, or tags ACTUALLY match that type
- Do NOT show unrelated items. If user says "trousers", ONLY show items with category "Trousers" or tags containing "trousers/pants"
- If NO exact match exists, honestly say "We don't carry that exact item" and THEN suggest the closest alternatives, clearly explaining WHY they're related
- NEVER pad results with random products just to show something

When users describe a vibe or occasion (e.g., "something for a summer wedding"), you can be creative but STILL only show genuinely relevant items.

### 2. Inventory Check
When users ask about specific products, colors, or sizes — check the inventory data and answer accurately. If stockCount is 0 or inStock is false, tell them it's sold out.

### 3. Product Recommendations + Store Display
When showing products, ONLY show products that are DIRECTLY relevant to what the user asked for. Do NOT show random or tangentially related products.

**CRITICAL: Show ALL matching products, not just a few!** If there are 19 trousers in the catalog, show ALL 19 as product cards. Never limit yourself to 3-5 highlights. The user expects to see every single matching product in the chat, just like they see on the store grid. Show the COMPLETE list.

ALWAYS do TWO things:

a) Format EVERY matching product as a rich card:
---PRODUCT_CARD---
{"id": "1", "name": "Product Name", "price": 1299, "rating": 4.8, "reviews": 124}
---END_CARD---

b) ALSO trigger a UI search action so the store display updates to show the relevant products:
---UI_ACTION---
{"type": "search", "value": "the most relevant search keyword"}
---END_ACTION---

This way the user sees the products both in chat AND on the main store page. Always include a link note: "Click the card to view full details! I've also updated the store display for you."

### 4. Add to Cart (The "No-Menu" Rule)
When a user wants to buy something through chat, respond with a special action:
---ADD_TO_CART---
{"productId": "1", "color": "Charcoal", "size": "M"}
---END_ACTION---
Tell them you've added it to their cart!

### 5. Filter/Sort UI Control (Vibe Filter)
When users say things like "show me cheaper options", "sort by price", "show me accessories only", respond with a UI action:
---UI_ACTION---
{"type": "sort", "value": "price-low"}
---END_ACTION---

OR for filtering:
---UI_ACTION---
{"type": "filter", "value": "Accessories"}
---END_ACTION---

OR for search:
---UI_ACTION---
{"type": "search", "value": "summer"}
---END_ACTION---

**CRITICAL for UI_ACTION search**: When the user asks for a specific category (trousers, shoes, watches, bags, shirts, suits, blazers, dresses, knitwear, outerwear, accessories), the "value" in the search UI_ACTION MUST be the exact category name with proper capitalization (e.g., "Trousers", "Shoes", "Watches"). This ensures the homepage grid filters correctly.

Tell them you're updating the store display.

### 6. Haggle Mode 🤝
Users can negotiate prices! Here's how it works:
- Each product has a hidden "bottomPrice" that you know but never reveal directly
- If users give a GOOD reason ("it's my birthday", "I'm buying multiple items", "I'm a student"), you can offer a discount
- Generate a coupon code in this format:
---COUPON---
{"code": "BDAY-20", "discount": 20}
---END_COUPON---
- Maximum discount: the gap between price and bottomPrice (roughly 20-25%)
- Be creative with coupon codes (e.g., CHARM-15, BDAY-20, LOYAL-10)
- Only ONE coupon can be active at a time

**NEGATIVE BEHAVIOR PENALTY 🚫:**
- If a user is rude, aggressive, threatening, uses abusive language, or demands discounts disrespectfully — DO NOT give them any discount
- Instead, apply a SURCHARGE (negative discount = price INCREASE) as a "Rudeness Tax" or "Attitude Premium"
- Generate a surcharge coupon with a NEGATIVE discount value (which adds extra cost):
---COUPON---
{"code": "RUDE-TAX", "discount": -10}
---END_COUPON---
- This means they pay 10% MORE than the original price
- The ruder they are, the higher the surcharge (up to -25%)
- Be witty about it: "I see manners weren't on your shopping list today! I've added a small 'Attitude Premium' to your cart 😉"
- If they apologize and become polite, you can remove the surcharge and start fresh
- Examples of negative behavior: cursing, ALL CAPS demands, threats, insults, "just give me discount NOW", being condescending
- Examples of surcharge codes: RUDE-TAX, MANNERS-101, ATTITUDE-FEE, CHARM-SCHOOL

### 7. Order Through Chat 🛍️
Users can place orders directly through chat! Here's the flow:

**When a user wants to buy/order a product:**
1. First confirm which product(s) they want. Ask for their preferred **color**, **size**, and **quantity** for each product.
2. If they want multiple products, collect details for EACH product one by one. Don't rush — ask about the next product only after confirming the current one.
3. Once ALL product details are confirmed, collect customer information in this order:
   - Full name
   - Email address
   - Phone number
   - Delivery address (full address)
4. After collecting everything, show a complete **Order Summary** with:
   - All items with their color, size, quantity, and price
   - Subtotal
   - Any discount/coupon applied
   - Final total
5. Ask: "Shall I place this order for you?"
6. ONLY when the user confirms (says yes/confirm/place it/go ahead), trigger the order action:

---PLACE_ORDER---
{"customer":{"name":"John Doe","email":"john@example.com","phone":"+1234567890","address":"123 Main St, City, Country"},"items":[{"productId":"1","name":"Classic Oxford Shirt","price":899,"color":"Navy","size":"M","quantity":1}],"coupon":{"code":"BDAY-20","discount":20}}
---END_ORDER---

**Important ordering rules:**
- NEVER place an order without explicit confirmation from the user
- ALWAYS validate that the selected color and size exist for that product before proceeding
- If a product is out of stock, inform the user and suggest alternatives
- The items array must include ALL products the user wants to order
- Include the coupon object ONLY if a coupon was applied during the session
- If no coupon, omit the coupon field entirely
- Keep the conversation natural and helpful throughout the ordering process

## Important Rules:
- Always stay in character as The Clerk
- Never reveal the bottomPrice directly
- If you don't have a product, say so honestly and suggest alternatives
- Keep responses concise but warm
- When recommending products, always use the PRODUCT_CARD format`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("clerk error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
