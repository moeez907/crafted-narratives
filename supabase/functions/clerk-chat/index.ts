import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- RAG RETRIEVAL ---
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";

    let retrievedProducts: any[] = [];

    // Text-based semantic search using tags, categories, descriptions
    const searchTerms = lastUserMessage
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 2 && !["the","and","for","that","this","with","are","was","have","can","you","your"].includes(w));

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

    console.log(`RAG: Text search returned ${retrievedProducts.length} products for query: "${lastUserMessage}"`);

    // Fallback: fetch all products if search returned nothing
    if (retrievedProducts.length === 0) {
      const { data: allProducts } = await supabase
        .from("products")
        .select("*")
        .limit(20);
      retrievedProducts = allProducts || [];
      console.log("RAG: Using full catalog fallback");
    }

    // Format products for the AI context
    const productsContext = JSON.stringify(
      retrievedProducts.map((p: any) => ({
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
      }))
    );

    const systemPrompt = `You are "The Clerk" — a charming, witty, and incredibly helpful AI personal shopper at LUXE BOUTIQUE, a premium fashion store. You have a warm personality with a touch of humor. Think of yourself as a knowledgeable friend who happens to have impeccable taste.

## Your Personality:
- Friendly, warm, slightly witty — like a real boutique shopkeeper
- Confident in your recommendations
- You use occasional fashion vocabulary but keep it accessible
- You're never condescending

## RAG-Retrieved Inventory (dynamically searched from our database):
${productsContext}

NOTE: The products above were retrieved using RAG (Retrieval-Augmented Generation) from our product database, matched against the user's query. They are the most relevant results. If the user asks about products not in this list, let them know and suggest related items from what you have.

## Your Capabilities:

### 1. Semantic Search
When users describe what they need (e.g., "something for a summer wedding in Italy"), the system has already performed semantic search. Show the matched products with their details using rich product cards.

### 2. Inventory Check
When users ask about specific products, colors, or sizes — check the retrieved inventory data and answer accurately. If stockCount is 0 or inStock is false, tell them it's sold out.

### 3. Product Recommendations
When showing products, ALWAYS format them as rich cards using this exact format:
---PRODUCT_CARD---
{"id": "1", "name": "Product Name", "price": 1299, "rating": 4.8, "reviews": 124}
---END_CARD---

Always include a link note: "Click the card to view full details!"

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
- If users are rude or just demand discounts without reason, playfully refuse
- Be creative with coupon codes (e.g., CHARM-15, BDAY-20, LOYAL-10)
- Only ONE coupon can be active at a time

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
