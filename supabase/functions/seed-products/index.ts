import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Feature Hashing (djb2) — generates deterministic 384-dim vectors for cosine similarity in pgvector.
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
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Request body must contain a 'products' array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches of 20 to avoid timeouts
    const batchSize = 20;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      const records = batch.map((p: any) => {
        const textToEmbed = [
          p.name,
          p.description,
          p.category,
          (p.tags || []).join(" "),
          (p.colors || []).join(" "),
        ].join(" ");

        const embedding = generateHashEmbedding(textToEmbed);
        const embeddingStr = `[${embedding.join(",")}]`;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          bottom_price: p.bottomPrice || p.bottom_price,
          category: p.category,
          tags: p.tags,
          colors: p.colors,
          sizes: p.sizes,
          rating: p.rating,
          reviews: p.reviews,
          image: p.image,
          color_images: p.colorImages || p.color_images,
          in_stock: p.inStock ?? p.in_stock ?? true,
          stock_count: p.stockCount ?? p.stock_count ?? 0,
          embedding: embeddingStr,
        };
      });

      const { error } = await supabase.from("products").upsert(records, { onConflict: "id" });

      if (error) {
        console.error(`Batch error at index ${i}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: products.length,
        seeded: successCount,
        errors: errorCount,
        embedding_method: "Feature Hashing (djb2, 384-dim, L2-normalized)",
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
