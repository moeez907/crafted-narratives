
-- Enable pgvector extension (Supabase's equivalent of ChromaDB)
CREATE EXTENSION IF NOT EXISTS vector;

-- Products table with vector embeddings for RAG
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL,
  bottom_price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  rating NUMERIC DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  image TEXT DEFAULT '',
  color_images JSONB DEFAULT '{}',
  in_stock BOOLEAN DEFAULT true,
  stock_count INTEGER DEFAULT 0,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
ON public.products FOR SELECT USING (true);

-- Vector similarity search function (RAG retrieval - replaces ChromaDB queries)
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  price NUMERIC,
  bottom_price NUMERIC,
  category TEXT,
  tags TEXT[],
  colors TEXT[],
  sizes TEXT[],
  rating NUMERIC,
  reviews INTEGER,
  image TEXT,
  color_images JSONB,
  in_stock BOOLEAN,
  stock_count INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.description, p.price, p.bottom_price,
    p.category, p.tags, p.colors, p.sizes, p.rating,
    p.reviews, p.image, p.color_images, p.in_stock, p.stock_count,
    (1 - (p.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Text-based fallback search
CREATE OR REPLACE FUNCTION public.search_products_by_text(
  search_query TEXT,
  match_count INT DEFAULT 10
)
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.products p
  WHERE
    p.name ILIKE '%' || search_query || '%'
    OR p.description ILIKE '%' || search_query || '%'
    OR p.category ILIKE '%' || search_query || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%' || search_query || '%'
    )
  LIMIT match_count;
END;
$$;
