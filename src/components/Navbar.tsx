import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { cartCount, setIsCartOpen, searchQuery, setSearchQuery } = useStore();
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile menu */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link to="/" className="font-display text-xl md:text-2xl font-semibold tracking-wide">
            <span className="text-gold-gradient">LUXE</span>
            <span className="text-foreground ml-1 font-light">BOUTIQUE</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide uppercase">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Shop</Link>
            <Link to="/collections" className="text-muted-foreground hover:text-primary transition-colors">Collections</Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gold-gradient text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 bg-transparent border-t border-border text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border"
          >
            <div className="px-4 py-4 flex flex-col gap-3 text-sm uppercase tracking-wide font-medium">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary py-2">Shop</Link>
              <Link to="/collections" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary py-2">Collections</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary py-2">About</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
