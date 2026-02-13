import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ShoppingBag, ArrowLeft, Heart, Share2 } from "lucide-react";
import { products } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import AIClerk from "@/components/AIClerk";

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { addToCart } = useStore();
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] || "");

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <AIClerk />
      <div className="pt-24 pb-16 container mx-auto px-4 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[3/4] rounded-xl overflow-hidden bg-card"
          >
            <img src={product.colorImages?.[selectedColor] || product.image} alt={product.name} className="w-full h-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">{product.category}</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{product.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating} · {product.reviews} reviews
              </span>
            </div>
            <p className="text-3xl font-bold text-primary mb-6">${product.price}</p>
            <p className="text-muted-foreground leading-relaxed mb-8">{product.description}</p>

            {/* Color Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Color: <span className="text-muted-foreground">{selectedColor}</span></p>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 text-sm rounded border transition-colors ${
                      selectedColor === color
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-8">
              <p className="text-sm font-medium mb-3">Size: <span className="text-muted-foreground">{selectedSize}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 text-sm rounded border transition-colors flex items-center justify-center ${
                      selectedSize === size
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Status */}
            <p className={`text-sm mb-6 ${product.inStock ? "text-green-500" : "text-destructive"}`}>
              {product.inStock ? `${product.stockCount} in stock` : "Out of Stock"}
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product, selectedColor, selectedSize)}
                disabled={!product.inStock}
                className="flex-1 py-4 bg-gold-gradient text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingBag size={18} /> Add to Cart
              </motion.button>
              <button className="w-12 h-12 border border-border rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                <Heart size={18} />
              </button>
              <button className="w-12 h-12 border border-border rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                <Share2 size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
