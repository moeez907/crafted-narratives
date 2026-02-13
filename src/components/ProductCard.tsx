import { motion } from "framer-motion";
import { Star, ShoppingBag } from "lucide-react";
import { Product } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const { addToCart } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg aspect-[3/4] bg-card">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Sold Out
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.preventDefault();
              if (product.inStock) {
                addToCart(product, product.colors[0], product.sizes[0]);
              }
            }}
            className="absolute bottom-4 left-4 right-4 py-3 bg-gold-gradient text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={!product.inStock}
          >
            <ShoppingBag size={16} />
            Quick Add
          </motion.button>
        </div>
      </Link>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1">
          <Star size={12} className="fill-primary text-primary" />
          <span className="text-xs text-muted-foreground">
            {product.rating} ({product.reviews})
          </span>
        </div>
        <Link to={`/product/${product.id}`}>
          <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm font-semibold text-primary">${product.price}</p>
      </div>
    </motion.div>
  );
};

export default ProductCard;
