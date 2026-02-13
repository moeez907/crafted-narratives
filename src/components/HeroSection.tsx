import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const HeroSection = () => {
  return (
    <section className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="Luxury fashion collection"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
      </div>

      <div className="relative container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-primary text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            New Collection 2026
          </motion.p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Where Style
            <br />
            <span className="text-gold-gradient">Meets You</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md leading-relaxed">
            Experience shopping reimagined. Our AI personal shopper finds exactly what you need — just ask.
          </p>
          <div className="flex flex-wrap gap-4">
            <motion.a
              href="#shop"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold-gradient text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
            >
              Shop Now <ArrowRight size={16} />
            </motion.a>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground text-sm font-semibold uppercase tracking-wider rounded hover:border-primary hover:text-primary transition-colors"
              onClick={() => {
                const event = new CustomEvent("open-clerk");
                window.dispatchEvent(event);
              }}
            >
              <MessageCircle size={16} /> Talk to Clerk
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
