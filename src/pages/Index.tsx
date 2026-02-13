import { useMemo } from "react";
import { motion } from "framer-motion";
import { products, categories } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import AIClerk from "@/components/AIClerk";

const Index = () => {
  const { sortBy, setSortBy, filterCategory, setFilterCategory, searchQuery, clerkSelectedIds } = useStore();

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // If clerk has selected products, show only those
    if (clerkSelectedIds.length > 0) {
      filtered = filtered.filter((p) => clerkSelectedIds.includes(p.id));
    } else {
      if (searchQuery) {
        const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        filtered = filtered.filter((p) => {
          const searchable = `${p.name} ${p.description} ${p.tags.join(" ")} ${p.category}`.toLowerCase();
          return words.every(word => searchable.includes(word));
        });
      }

      if (filterCategory !== "All") {
        filtered = filtered.filter((p) => p.category === filterCategory);
      }
    }

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        filtered.reverse();
        break;
    }

    return filtered;
  }, [sortBy, filterCategory, searchQuery, clerkSelectedIds]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <AIClerk />

      <HeroSection />

      {/* Shop Section */}
      <section id="shop" className="py-16 container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Our Collection</h2>
            <p className="text-sm text-muted-foreground mt-1">{filteredProducts.length} products</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {["All", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full transition-colors ${
                    filterCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </motion.div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p className="font-display text-lg mb-2">
            <span className="text-gold-gradient font-semibold">LUXE</span> BOUTIQUE
          </p>
          <p>© 2026 Luxe Boutique. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
