import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import AIClerk from "@/components/AIClerk";
import { CheckCircle, Loader2 } from "lucide-react";

const Checkout = () => {
  const { cart, cartTotal, coupon, clearCart } = useStore();
  const navigate = useNavigate();
  const discountedTotal = coupon ? cartTotal * (1 - coupon.discount / 100) : cartTotal;

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", address: "", city: "", zip: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (!form.firstName || !form.email || !form.address || !form.phone) return;
    setIsSubmitting(true);

    const items = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      color: item.selectedColor,
      size: item.selectedSize,
      quantity: item.quantity,
    }));

    const { error } = await supabase.from("orders").insert({
      customer_name: `${form.firstName} ${form.lastName}`.trim(),
      customer_email: form.email,
      customer_phone: form.phone,
      customer_address: `${form.address}, ${form.city} ${form.zip}`.trim(),
      items,
      subtotal: cartTotal,
      discount_percent: coupon?.discount || 0,
      coupon_code: coupon?.code || null,
      total: discountedTotal,
      status: "pending",
    });

    setIsSubmitting(false);

    if (!error) {
      // Trigger n8n webhook
      try {
        await fetch("https://abdulmoeez7.app.n8n.cloud/webhook/0e95befa-36c6-4d7c-a36d-c565cef41c33", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: JSON.stringify({
            customer_name: `${form.firstName} ${form.lastName}`.trim(),
            customer_email: form.email,
            customer_phone: form.phone,
            customer_address: `${form.address}, ${form.city} ${form.zip}`.trim(),
            items,
            subtotal: cartTotal,
            discount_percent: coupon?.discount || 0,
            coupon_code: coupon?.code || null,
            total: discountedTotal,
            status: "pending",
            ordered_at: new Date().toISOString(),
          }),
        });
      } catch (webhookErr) {
        console.warn("n8n webhook failed:", webhookErr);
      }

      setOrderPlaced(true);
      clearCart();
    } else {
      console.error("Order error:", error);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center text-center px-4">
          <CheckCircle size={64} className="text-primary mb-4" />
          <h1 className="font-display text-3xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground mb-6">Thank you for your purchase. You'll receive a confirmation at your email.</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-gold-gradient text-primary-foreground rounded font-semibold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

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
                <h2 className="font-display text-lg font-semibold mb-4">Your Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name *" className="col-span-1 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className="col-span-1 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="email" value={form.email} onChange={handleChange} placeholder="Email *" className="col-span-2 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone *" className="col-span-2 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="address" value={form.address} onChange={handleChange} placeholder="Address *" className="col-span-2 px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <input name="zip" value={form.zip} onChange={handleChange} placeholder="Zip Code" className="px-4 py-3 rounded bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
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
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !form.firstName || !form.email || !form.address || !form.phone}
                  className="w-full mt-6 py-4 bg-gold-gradient text-primary-foreground text-sm font-semibold uppercase tracking-wider rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Placing Order...</> : "Place Order"}
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
