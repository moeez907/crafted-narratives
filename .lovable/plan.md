

# n8n Webhook Integration — Order Notifications

## Overview
Jab bhi order place ho (clerk ya manual), n8n webhook trigger hoga aur saari order details (customer name, email, phone, address, products, prices, discount) n8n ko bhejega.

## What Will Change

### File: `src/components/AIClerk.tsx`
Order successfully insert hone ke baad, webhook call add karenge:

- Order insert success ke baad (`else` block at line 117), ek `fetch` call karenge n8n webhook URL pe
- `POST` request with `mode: "no-cors"` (CORS handle karne ke liye)
- Body mein poora order data bhejenge:
  - `customer_name`, `customer_email`, `customer_phone`, `customer_address`
  - `items` array (har product ka name, price, color, size, quantity)
  - `subtotal`, `discount_percent`, `coupon_code`, `total`
  - `status`, `ordered_at` timestamp
- Webhook URL hardcode karenge: `https://abdulmoeez7.app.n8n.cloud/webhook-test/0e95befa-36c6-4d7c-a36d-c565cef41c33`
- Webhook failure silently log hogi — order placement block nahi hoga

### Technical Detail

Line ~117-119 ke baad ye code add hoga:

```typescript
// Trigger n8n webhook
try {
  await fetch("https://abdulmoeez7.app.n8n.cloud/webhook-test/0e95befa-36c6-4d7c-a36d-c565cef41c33", {
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
```

No other files need changes. Single file edit, minimal impact.

