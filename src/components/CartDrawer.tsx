import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Link } from "react-router-dom";

const CartDrawer = () => {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, cartTotal, coupon } = useStore();

  const discountedTotal = coupon ? cartTotal * (1 - coupon.discount / 100) : cartTotal;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <ShoppingBag size={48} strokeWidth={1} />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-20 h-24 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{item.product.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.selectedColor} / {item.selectedSize}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">${item.product.price}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border p-6 space-y-4">
                  {coupon && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coupon: <span className="text-primary font-mono">{coupon.code}</span></span>
                      <span className="text-primary">-{coupon.discount}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <div>
                      {coupon && (
                        <span className="text-sm text-muted-foreground line-through mr-2">${cartTotal.toFixed(2)}</span>
                      )}
                      <span className="text-lg font-semibold">${discountedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={() => setIsCartOpen(false)}
                    className="block w-full py-3 bg-gold-gradient text-primary-foreground text-center text-sm font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
                  >
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
