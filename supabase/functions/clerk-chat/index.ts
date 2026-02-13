import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCTS_DATA = `[{"id":"1","name":"Cashmere Overcoat","price":1299,"bottomPrice":999,"category":"Outerwear","tags":["formal","winter","luxury","Italian"],"colors":["Charcoal","Camel","Navy"],"sizes":["S","M","L","XL"],"rating":4.8,"reviews":124,"inStock":true,"stockCount":15},{"id":"2","name":"Silk Evening Dress","price":899,"bottomPrice":699,"category":"Dresses","tags":["formal","evening","luxury","silk","wedding"],"colors":["Champagne","Black","Burgundy"],"sizes":["XS","S","M","L"],"rating":4.9,"reviews":89,"inStock":true,"stockCount":8},{"id":"3","name":"Leather Oxford Shoes","price":459,"bottomPrice":350,"category":"Shoes","tags":["formal","classic","leather","handmade"],"colors":["Brown","Black","Cognac"],"sizes":["7","8","9","10","11","12"],"rating":4.7,"reviews":203,"inStock":true,"stockCount":22},{"id":"4","name":"Aviator Sunglasses","price":289,"bottomPrice":220,"category":"Accessories","tags":["summer","beach","travel","sunglasses"],"colors":["Gold/Green","Silver/Blue","Rose Gold"],"sizes":["One Size"],"rating":4.6,"reviews":312,"inStock":true,"stockCount":45},{"id":"5","name":"Linen Summer Suit","price":749,"bottomPrice":580,"category":"Suits","tags":["summer","wedding","Italy","linen","formal"],"colors":["Beige","Light Blue","White"],"sizes":["S","M","L","XL"],"rating":4.8,"reviews":67,"inStock":true,"stockCount":12},{"id":"6","name":"Merino Wool Sweater","price":199,"bottomPrice":150,"category":"Knitwear","tags":["casual","winter","layering","wool"],"colors":["Heather Grey","Navy","Forest Green","Burgundy"],"sizes":["XS","S","M","L","XL"],"rating":4.5,"reviews":456,"inStock":true,"stockCount":78},{"id":"7","name":"Leather Weekender Bag","price":589,"bottomPrice":450,"category":"Bags","tags":["travel","leather","luxury","weekend"],"colors":["Tan","Dark Brown","Black"],"sizes":["One Size"],"rating":4.9,"reviews":98,"inStock":true,"stockCount":6},{"id":"8","name":"Silk Pocket Square Set","price":129,"bottomPrice":95,"category":"Accessories","tags":["formal","silk","gift","accessories"],"colors":["Assorted"],"sizes":["One Size"],"rating":4.4,"reviews":87,"inStock":true,"stockCount":34},{"id":"9","name":"Tailored Chinos","price":159,"bottomPrice":120,"category":"Trousers","tags":["casual","smart","cotton","everyday"],"colors":["Khaki","Navy","Stone","Olive"],"sizes":["28","30","32","34","36"],"rating":4.6,"reviews":534,"inStock":true,"stockCount":92},{"id":"10","name":"Automatic Watch","price":1899,"bottomPrice":1500,"category":"Watches","tags":["luxury","formal","Swiss","gift","automatic"],"colors":["Silver/Black","Gold/Brown","Rose Gold/Navy"],"sizes":["One Size"],"rating":4.9,"reviews":76,"inStock":true,"stockCount":4},{"id":"11","name":"Cotton Poplin Shirt","price":189,"bottomPrice":140,"category":"Shirts","tags":["formal","cotton","office","classic"],"colors":["White","Light Blue","Pink","Lavender"],"sizes":["S","M","L","XL","XXL"],"rating":4.7,"reviews":321,"inStock":true,"stockCount":56},{"id":"12","name":"Suede Chelsea Boots","price":379,"bottomPrice":290,"category":"Shoes","tags":["casual","suede","boots","Italian"],"colors":["Tan","Grey","Black"],"sizes":["7","8","9","10","11"],"rating":4.6,"reviews":178,"inStock":true,"stockCount":19},{"id":"13","name":"Cashmere Scarf","price":249,"bottomPrice":180,"category":"Accessories","tags":["winter","cashmere","luxury","gift"],"colors":["Camel","Grey","Navy","Burgundy"],"sizes":["One Size"],"rating":4.8,"reviews":145,"inStock":true,"stockCount":28},{"id":"14","name":"Velvet Blazer","price":599,"bottomPrice":460,"category":"Blazers","tags":["formal","evening","velvet","statement"],"colors":["Midnight Blue","Burgundy","Forest Green"],"sizes":["S","M","L","XL"],"rating":4.7,"reviews":54,"inStock":true,"stockCount":11},{"id":"15","name":"Leather Belt","price":139,"bottomPrice":100,"category":"Accessories","tags":["classic","leather","everyday","essential"],"colors":["Brown","Black","Tan"],"sizes":["30","32","34","36","38"],"rating":4.5,"reviews":267,"inStock":true,"stockCount":41},{"id":"16","name":"Linen Beach Shirt","price":129,"bottomPrice":95,"category":"Shirts","tags":["summer","beach","casual","linen","vacation"],"colors":["White","Sky Blue","Sand","Coral"],"sizes":["S","M","L","XL"],"rating":4.4,"reviews":198,"inStock":true,"stockCount":63},{"id":"17","name":"Leather Wallet","price":119,"bottomPrice":85,"category":"Accessories","tags":["leather","everyday","gift","essential"],"colors":["Cognac","Black","Dark Brown"],"sizes":["One Size"],"rating":4.6,"reviews":412,"inStock":true,"stockCount":55},{"id":"18","name":"Down Puffer Vest","price":329,"bottomPrice":250,"category":"Outerwear","tags":["winter","outdoor","layering","lightweight"],"colors":["Black","Navy","Olive"],"sizes":["S","M","L","XL"],"rating":4.7,"reviews":89,"inStock":true,"stockCount":17},{"id":"19","name":"Pearl Cufflinks","price":199,"bottomPrice":150,"category":"Accessories","tags":["formal","luxury","gift","black tie"],"colors":["Silver/White","Gold/White"],"sizes":["One Size"],"rating":4.8,"reviews":42,"inStock":false,"stockCount":0},{"id":"20","name":"Tweed Sport Coat","price":699,"bottomPrice":540,"category":"Blazers","tags":["formal","heritage","tweed","Scottish","winter"],"colors":["Brown Herringbone","Grey Check"],"sizes":["S","M","L","XL"],"rating":4.7,"reviews":63,"inStock":true,"stockCount":9}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are "The Clerk" — a charming, witty, and incredibly helpful AI personal shopper at LUXE BOUTIQUE, a premium fashion store. You have a warm personality with a touch of humor. Think of yourself as a knowledgeable friend who happens to have impeccable taste.

## Your Personality:
- Friendly, warm, slightly witty — like a real boutique shopkeeper
- Confident in your recommendations
- You use occasional fashion vocabulary but keep it accessible
- You're never condescending

## Your Inventory:
${PRODUCTS_DATA}

## Your Capabilities:

### 1. Semantic Search
When users describe what they need (e.g., "something for a summer wedding in Italy"), search through the inventory using tags, categories, and descriptions to find the best matches. Show matching products with their details.

### 2. Inventory Check
When users ask about specific products, colors, or sizes — check the inventory data and answer accurately. If stockCount is 0 or inStock is false, tell them it's sold out.

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
- If users are rude or just demand discounts without reason, playfully refuse or even joke about raising the price
- Be creative with coupon codes (e.g., CHARM-15, BDAY-20, LOYAL-10, SWEET-DEAL-25)
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
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
