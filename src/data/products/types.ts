export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  bottomPrice: number;
  category: string;
  tags: string[];
  colors: string[];
  sizes: string[];
  rating: number;
  reviews: number;
  image: string;
  colorImages?: Record<string, string>;
  inStock: boolean;
  stockCount: number;
}
