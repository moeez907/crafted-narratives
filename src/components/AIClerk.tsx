import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Star, ShoppingBag, CheckCircle, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStore } from "@/context/StoreContext";
import { products } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";


interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clerk-chat`;

const AIClerk = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to **LUXE BOUTIQUE**! 👋 I'm your personal Clerk. I can help you find the perfect outfit, check sizes, and even negotiate a special deal. What are you looking for today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; name: string; price: number; colors: string; sizes: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToCart, setSortBy, setFilterCategory, setSearchQuery, applyCoupon, setClerkSelectedIds } = useStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-clerk", handler);
    return () => window.removeEventListener("open-clerk", handler);
  }, []);

  const processActions = useCallback(
    (text: string) => {
      // Process ADD_TO_CART
      const cartMatch = text.match(/---ADD_TO_CART---\s*(\{[^}]+\})\s*---END_ACTION---/g);
      if (cartMatch) {
        cartMatch.forEach((m) => {
          const json = m.match(/\{[^}]+\}/);
          if (json) {
            try {
              const data = JSON.parse(json[0]);
              const product = products.find((p) => p.id === data.productId);
              if (product) {
                addToCart(product, data.color || product.colors[0], data.size || product.sizes[0]);
              }
            } catch {}
          }
        });
      }

      // Process UI_ACTION
      const uiMatch = text.match(/---UI_ACTION---\s*(\{[^}]+\})\s*---END_ACTION---/g);
      if (uiMatch) {
        uiMatch.forEach((m) => {
          const json = m.match(/\{[^}]+\}/);
          if (json) {
            try {
              const data = JSON.parse(json[0]);
              if (data.type === "sort") setSortBy(data.value);
              if (data.type === "filter") setFilterCategory(data.value);
              if (data.type === "search") setSearchQuery(data.value);
            } catch {}
          }
        });
      }

      // Process COUPON
      const couponMatch = text.match(/---COUPON---\s*(\{[^}]+\})\s*---END_COUPON---/g);
      if (couponMatch) {
        couponMatch.forEach((m) => {
          const json = m.match(/\{[^}]+\}/);
          if (json) {
            try {
              const data = JSON.parse(json[0]);
              applyCoupon({ code: data.code, discount: data.discount });
            } catch {}
          }
        });
      }

      // Process PLACE_ORDER
      const orderMatch = text.match(/---PLACE_ORDER---\s*([\s\S]*?)\s*---END_ORDER---/g);
      if (orderMatch) {
        orderMatch.forEach(async (m) => {
          const jsonStr = m.replace(/---PLACE_ORDER---/, "").replace(/---END_ORDER---/, "").trim();
          try {
            const data = JSON.parse(jsonStr);
            const items = data.items || [];
            const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0);
            const discountPercent = data.coupon?.discount || 0;
            const total = subtotal * (1 - discountPercent / 100);

            const { error } = await supabase.from("orders").insert({
              customer_name: data.customer.name,
              customer_email: data.customer.email,
              customer_phone: data.customer.phone,
              customer_address: data.customer.address,
              items: items,
              subtotal,
              discount_percent: discountPercent,
              coupon_code: data.coupon?.code || null,
              total,
              status: "pending",
            });

            if (error) {
              console.error("Order insert error:", error);
            } else {
              console.log("Order placed successfully!");
              // Trigger n8n webhook
              try {
                await fetch("https://abdulmoeez7.app.n8n.cloud/webhook/0e95befa-36c6-4d7c-a36d-c565cef41c33", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  mode: "no-cors",
                  body: JSON.stringify({
                    customer_name: data.customer.name,
                    customer_email: data.customer.email,
                    customer_phone: data.customer.phone,
                    customer_address: data.customer.address,
                    items,
                    subtotal,
                    discount_percent: discountPercent,
                    coupon_code: data.coupon?.code || null,
                    total,
                    status: "pending",
                    ordered_at: new Date().toISOString(),
                  }),
                });
              } catch (webhookErr) {
                console.warn("n8n webhook failed:", webhookErr);
              }
            }
          } catch (e) {
            console.error("Order parse error:", e);
          }
        });
      }
    },
    [addToCart, setSortBy, setFilterCategory, setSearchQuery, applyCoupon]
  );

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput ?? input.trim();
    if (!text || isLoading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideInput) setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > newMessages.length) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      processActions(assistantSoFar);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again!" },
      ]);
    }
    setIsLoading(false);
  };

  const renderContent = (content: string) => {
    // Remove action blocks from display
    const cleaned = content
      .replace(/---ADD_TO_CART---[\s\S]*?---END_ACTION---/g, "✅ *Added to cart!*")
      .replace(/---UI_ACTION---[\s\S]*?---END_ACTION---/g, "✨ *Updated the store display!*")
      .replace(/---COUPON---[\s\S]*?---END_COUPON---/g, "")
      .replace(/---PLACE_ORDER---[\s\S]*?---END_ORDER---/g, "✅ **Order placed successfully!** 🎉 You'll receive a confirmation at your email shortly.");

    // Extract product cards
    const parts = cleaned.split(/---PRODUCT_CARD---|---END_CARD---/);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // Product card JSON
        try {
          const p = JSON.parse(part.trim());
          const product = products.find(prod => prod.id === p.id);
          const availableColors = product?.colors?.join(", ") || "N/A";
          const availableSizes = product?.sizes?.join(", ") || "N/A";
          const isSelected = selectedProducts.some(sp => sp.id === p.id);
          return (
            <button
              key={i}
              onClick={() => {
                const product = products.find(prod => prod.id === p.id);
                const availableColors = product?.colors?.join(", ") || "N/A";
                const availableSizes = product?.sizes?.join(", ") || "N/A";
                setSelectedProducts(prev => {
                  let next;
                  if (prev.some(sp => sp.id === p.id)) {
                    next = prev.filter(sp => sp.id !== p.id);
                  } else {
                    next = [...prev, { id: p.id, name: p.name, price: p.price, colors: availableColors, sizes: availableSizes }];
                  }
                  setClerkSelectedIds(next.map(sp => sp.id));
                  return next;
                });
              }}
              className={`block w-full text-left my-2 p-3 rounded-lg border transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-secondary/50 border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="fill-primary text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {p.rating} ({p.reviews})
                    </span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-bold text-primary text-sm">${p.price}</p>
                    <ShoppingBag size={12} className="text-muted-foreground ml-auto mt-1" />
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        } catch {
          return <span key={i}>{part}</span>;
        }
      }
      return (
        <div key={i} className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
          <ReactMarkdown>{part}</ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gold-gradient rounded-full flex items-center justify-center shadow-gold animate-pulse-gold"
          >
            <MessageCircle size={24} className="text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[550px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gold-gradient">
              <div>
                <h3 className="font-display text-sm font-bold text-primary-foreground">The Clerk</h3>
                <p className="text-xs text-primary-foreground/70">Your AI Personal Shopper</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Products Bar */}
            {selectedProducts.length > 0 && (
              <div className="px-3 pt-2 pb-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProducts([]);
                        setClerkSelectedIds([]);
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        const productList = selectedProducts
                          .map(sp => `"${sp.name}" (ID: ${sp.id}, Price: $${sp.price}, Colors: ${sp.colors}, Sizes: ${sp.sizes})`)
                          .join(", ");
                        const msg = `I want to order these ${selectedProducts.length} products: ${productList}. Please ask me to pick my preferred color, size, and quantity for EACH product one by one, then proceed with the order.`;
                        setSelectedProducts([]);
                        setClerkSelectedIds([]);
                        sendMessage(msg);
                      }}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-gold-gradient text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Order {selectedProducts.length} item{selectedProducts.length > 1 ? "s" : ""} →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2.5 text-sm bg-input rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-gold-gradient rounded-full flex items-center justify-center disabled:opacity-50"
                >
                  <Send size={16} className="text-primary-foreground" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIClerk;
