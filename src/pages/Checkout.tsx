import { motion } from "framer-motion";
import { useStore } from "@/context/StoreContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import AIClerk from "@/components/AIClerk";

const Checkout = () => {
  const { cart, cartTotal, coupon } = useStore();
  const discountedTotal = coupon ? cartTotal * (1 - coupon.discount / 100) : cartTotal;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <AIClerk />
      <div className="pt-24 pb-16 container mx-auto px-4 md:px-8 max-w-4xl">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold mb-8"
        >
          Checkout
        </motion.h1>

        {cart.length === 0 ? (
          <p className="text-muted-foreground">Your cart is empty.</p>
        ) : (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="font-display text-lg font-semibold mb-4">Shipping Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="First Name" className="col-span-1 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input placeholder="Last Name" className="col-span-1 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input placeholder="Email" className="col-span-2 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input placeholder="Address" className="col-span-2 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input placeholder="City" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input placeholder="Zip Code" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="font-display text-lg font-semibold mb-4">Payment</h2>
                <div className="space-y-4">
                  <input placeholder="Card Number" className="w-full px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="MM/YY" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                    <input placeholder="CVC" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="bg-card rounded-xl p-6 border border-border sticky top-24">
                <h2 className="font-display text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                      <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  {coupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">Coupon ({coupon.code})</span>
                      <span className="text-primary">-{coupon.discount}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-primary">Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">${discountedTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button className="w-full mt-6 py-4 bg-gold-gradient text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity">
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
