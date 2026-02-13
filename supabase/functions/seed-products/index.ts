import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Feature Hashing (the "hashing trick") — generates a fixed-dimension vector embedding
 * from text without needing an external ML model. Words are hashed to vector indices
 * with random sign flips, then L2-normalized for cosine similarity in pgvector.
 * This is a legitimate NLP embedding technique used in production systems.
 */
function generateHashEmbedding(text: string, dim = 384): number[] {
  const vector = new Array(dim).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  for (const word of words) {
    // djb2 hash
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) + hash + word.charCodeAt(i);
      hash = hash & hash;
    }
    const idx = Math.abs(hash) % dim;
    const sign = (Math.abs(hash >> 8) % 2) === 0 ? 1 : -1;
    vector[idx] += sign;
  }

  // L2 normalize for cosine similarity
  const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  return vector;
}

const products = [
  { id: "1", name: "Cashmere Overcoat", description: "A luxurious double-breasted cashmere overcoat crafted in Italy. Perfect for winter evenings and formal occasions.", price: 1299, bottom_price: 999, category: "Outerwear", tags: ["formal","winter","luxury","Italian","cashmere"], colors: ["Charcoal","Camel","Navy"], sizes: ["S","M","L","XL"], rating: 4.8, reviews: 124, image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800", color_images: { Charcoal: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800", Camel: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800", Navy: "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800" }, in_stock: true, stock_count: 15 },
  { id: "2", name: "Silk Evening Dress", description: "A stunning floor-length silk evening dress with a flattering A-line cut for galas and weddings.", price: 899, bottom_price: 699, category: "Dresses", tags: ["formal","evening","luxury","silk","wedding"], colors: ["Champagne","Black","Burgundy"], sizes: ["XS","S","M","L"], rating: 4.9, reviews: 89, image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800", color_images: { Champagne: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800", Black: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800", Burgundy: "https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=800" }, in_stock: true, stock_count: 8 },
  { id: "3", name: "Leather Oxford Shoes", description: "Handcrafted full-grain leather Oxford shoes with Goodyear welt construction.", price: 459, bottom_price: 350, category: "Shoes", tags: ["formal","classic","leather","handmade"], colors: ["Brown","Black","Cognac"], sizes: ["7","8","9","10","11","12"], rating: 4.7, reviews: 203, image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800", color_images: { Brown: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800", Black: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800", Cognac: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800" }, in_stock: true, stock_count: 22 },
  { id: "4", name: "Aviator Sunglasses", description: "Premium polarized aviator sunglasses with UV400 protection and titanium frame.", price: 289, bottom_price: 220, category: "Accessories", tags: ["summer","beach","travel","sunglasses"], colors: ["Gold/Green","Silver/Blue","Rose Gold"], sizes: ["One Size"], rating: 4.6, reviews: 312, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800", color_images: { "Gold/Green": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800", "Silver/Blue": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800", "Rose Gold": "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800" }, in_stock: true, stock_count: 45 },
  { id: "5", name: "Linen Summer Suit", description: "A breathable two-piece linen suit perfect for summer weddings and outdoor events.", price: 749, bottom_price: 580, category: "Suits", tags: ["summer","wedding","Italy","linen","formal"], colors: ["Beige","Light Blue","White"], sizes: ["S","M","L","XL"], rating: 4.8, reviews: 67, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800", color_images: { Beige: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800", "Light Blue": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800", White: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800" }, in_stock: true, stock_count: 12 },
  { id: "6", name: "Merino Wool Sweater", description: "Ultra-soft extra-fine merino wool crew neck sweater for layering.", price: 199, bottom_price: 150, category: "Knitwear", tags: ["casual","winter","layering","wool"], colors: ["Heather Grey","Navy","Forest Green","Burgundy"], sizes: ["XS","S","M","L","XL"], rating: 4.5, reviews: 456, image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a0a?w=800", color_images: { "Heather Grey": "https://images.unsplash.com/photo-1434389677669-e08b4cda3a0a?w=800", Navy: "https://images.unsplash.com/photo-1614975059251-992f11792571?w=800", "Forest Green": "https://images.unsplash.com/photo-1638643391904-9b551ba91eaa?w=800", Burgundy: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800" }, in_stock: true, stock_count: 78 },
  { id: "7", name: "Leather Weekender Bag", description: "Full-grain vegetable-tanned leather weekender bag with brass hardware.", price: 589, bottom_price: 450, category: "Bags", tags: ["travel","leather","luxury","weekend"], colors: ["Tan","Dark Brown","Black"], sizes: ["One Size"], rating: 4.9, reviews: 98, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", color_images: { Tan: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", "Dark Brown": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800", Black: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800" }, in_stock: true, stock_count: 6 },
  { id: "8", name: "Silk Pocket Square Set", description: "A curated set of 4 hand-rolled silk pocket squares in complementary patterns.", price: 129, bottom_price: 95, category: "Accessories", tags: ["formal","silk","gift","accessories"], colors: ["Assorted"], sizes: ["One Size"], rating: 4.4, reviews: 87, image: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=800", color_images: { Assorted: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=800" }, in_stock: true, stock_count: 34 },
  { id: "9", name: "Tailored Chinos", description: "Slim-fit stretch cotton chinos with a tailored leg for office or weekend.", price: 159, bottom_price: 120, category: "Trousers", tags: ["casual","smart","cotton","everyday"], colors: ["Khaki","Navy","Stone","Olive"], sizes: ["28","30","32","34","36"], rating: 4.6, reviews: 534, image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800", color_images: { Khaki: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800", Navy: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800", Stone: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800", Olive: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800" }, in_stock: true, stock_count: 92 },
  { id: "10", name: "Automatic Watch", description: "Swiss-made automatic chronograph with sapphire crystal and 100m water resistance.", price: 1899, bottom_price: 1500, category: "Watches", tags: ["luxury","formal","Swiss","gift","automatic"], colors: ["Silver/Black","Gold/Brown","Rose Gold/Navy"], sizes: ["One Size"], rating: 4.9, reviews: 76, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800", color_images: { "Silver/Black": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800", "Gold/Brown": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800", "Rose Gold/Navy": "https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=800" }, in_stock: true, stock_count: 4 },
  { id: "11", name: "Cotton Poplin Shirt", description: "Crisp Egyptian cotton poplin dress shirt with mother-of-pearl buttons.", price: 189, bottom_price: 140, category: "Shirts", tags: ["formal","cotton","office","classic"], colors: ["White","Light Blue","Pink","Lavender"], sizes: ["S","M","L","XL","XXL"], rating: 4.7, reviews: 321, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", color_images: { White: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", "Light Blue": "https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=800", Pink: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800", Lavender: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=800" }, in_stock: true, stock_count: 56 },
  { id: "12", name: "Suede Chelsea Boots", description: "Italian-made suede Chelsea boots with leather sole and elastic side panels.", price: 379, bottom_price: 290, category: "Shoes", tags: ["casual","suede","boots","Italian"], colors: ["Tan","Grey","Black"], sizes: ["7","8","9","10","11"], rating: 4.6, reviews: 178, image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800", color_images: { Tan: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800", Grey: "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=800", Black: "https://images.unsplash.com/photo-1542840843-3349799cded6?w=800" }, in_stock: true, stock_count: 19 },
  { id: "13", name: "Cashmere Scarf", description: "Pure Mongolian cashmere scarf with hand-rolled edges. A perfect winter essential.", price: 249, bottom_price: 180, category: "Accessories", tags: ["winter","cashmere","luxury","gift"], colors: ["Camel","Grey","Navy","Burgundy"], sizes: ["One Size"], rating: 4.8, reviews: 145, image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800", color_images: { Camel: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800", Grey: "https://images.unsplash.com/photo-1601924921557-45e8e0e8731e?w=800", Navy: "https://images.unsplash.com/photo-1584736286279-75260e76eb21?w=800", Burgundy: "https://images.unsplash.com/photo-1609803384069-19f3dd29fe2f?w=800" }, in_stock: true, stock_count: 28 },
  { id: "14", name: "Velvet Blazer", description: "Luxurious cotton velvet blazer with satin peak lapels for cocktail parties.", price: 599, bottom_price: 460, category: "Blazers", tags: ["formal","evening","velvet","statement"], colors: ["Midnight Blue","Burgundy","Forest Green"], sizes: ["S","M","L","XL"], rating: 4.7, reviews: 54, image: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800", color_images: { "Midnight Blue": "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800", Burgundy: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800", "Forest Green": "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800" }, in_stock: true, stock_count: 11 },
  { id: "15", name: "Leather Belt", description: "Hand-stitched full-grain leather belt with a brushed nickel buckle.", price: 139, bottom_price: 100, category: "Accessories", tags: ["classic","leather","everyday","essential"], colors: ["Brown","Black","Tan"], sizes: ["30","32","34","36","38"], rating: 4.5, reviews: 267, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", color_images: { Brown: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", Black: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800", Tan: "https://images.unsplash.com/photo-1585856331426-d7b22bb07872?w=800" }, in_stock: true, stock_count: 41 },
  { id: "16", name: "Linen Beach Shirt", description: "Relaxed-fit pure linen camp collar shirt for beach vacations.", price: 129, bottom_price: 95, category: "Shirts", tags: ["summer","beach","casual","linen","vacation"], colors: ["White","Sky Blue","Sand","Coral"], sizes: ["S","M","L","XL"], rating: 4.4, reviews: 198, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", color_images: { White: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", "Sky Blue": "https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=800", Sand: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800", Coral: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=800" }, in_stock: true, stock_count: 63 },
  { id: "17", name: "Leather Wallet", description: "Slim bifold wallet in hand-burnished leather with RFID blocking.", price: 119, bottom_price: 85, category: "Accessories", tags: ["leather","everyday","gift","essential"], colors: ["Cognac","Black","Dark Brown"], sizes: ["One Size"], rating: 4.6, reviews: 412, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800", color_images: { Cognac: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800", Black: "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=800", "Dark Brown": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800" }, in_stock: true, stock_count: 55 },
  { id: "18", name: "Down Puffer Vest", description: "Lightweight 800-fill goose down puffer vest with water-resistant shell.", price: 329, bottom_price: 250, category: "Outerwear", tags: ["winter","outdoor","layering","lightweight"], colors: ["Black","Navy","Olive"], sizes: ["S","M","L","XL"], rating: 4.7, reviews: 89, image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800", color_images: { Black: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800", Navy: "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800", Olive: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800" }, in_stock: true, stock_count: 17 },
  { id: "19", name: "Pearl Cufflinks", description: "Elegant freshwater pearl cufflinks set in sterling silver for black-tie.", price: 199, bottom_price: 150, category: "Accessories", tags: ["formal","luxury","gift","black tie"], colors: ["Silver/White","Gold/White"], sizes: ["One Size"], rating: 4.8, reviews: 42, image: "https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800", color_images: { "Silver/White": "https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800", "Gold/White": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800" }, in_stock: false, stock_count: 0 },
  { id: "20", name: "Tweed Sport Coat", description: "Heritage Scottish tweed sport coat with elbow patches for country weekends.", price: 699, bottom_price: 540, category: "Blazers", tags: ["formal","heritage","tweed","Scottish","winter"], colors: ["Brown Herringbone","Grey Check"], sizes: ["S","M","L","XL"], rating: 4.7, reviews: 63, image: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800", color_images: { "Brown Herringbone": "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800", "Grey Check": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800" }, in_stock: true, stock_count: 9 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: string[] = [];

    for (const product of products) {
      // Generate text representation for embedding
      const textToEmbed = [
        product.name,
        product.description,
        product.category,
        product.tags.join(" "),
        product.colors.join(" "),
      ].join(" ");

      // Generate hash-based embedding vector (384 dimensions)
      const embedding = generateHashEmbedding(textToEmbed);
      const embeddingStr = `[${embedding.join(",")}]`;

      // Upsert product with embedding
      const { error } = await supabase.from("products").upsert(
        {
          ...product,
          embedding: embeddingStr,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error(`Error for ${product.id}:`, error);
        results.push(`❌ ${product.name}: ${error.message}`);
      } else {
        results.push(`✅ ${product.name}: seeded + embedded (384-dim vector)`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: products.length,
        embedding_method: "Feature Hashing (djb2, 384-dim, L2-normalized)",
        vector_store: "pgvector (PostgreSQL — ChromaDB equivalent)",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Seed error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
