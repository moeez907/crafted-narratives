
# AI Clerk Order Flow — Complete Chat-Based Ordering

## Overview
Clerk bot ke andar hi poora ordering system banayenge. User jab products select kare clerk mein, to clerk conversationally unki saari details collect karega (email, name, address, phone, size, color, quantity) aur order place karega — bina checkout page pe jaaye.

## Changes Required

### 1. Database: Orders Table
Naya `orders` table banayenge jo clerk se aane wale orders store karega:

```text
orders
  - id (uuid, primary key)
  - customer_name (text)
  - customer_email (text)
  - customer_phone (text)
  - customer_address (text)
  - items (jsonb) -- array of {productId, name, price, color, size, quantity}
  - subtotal (numeric)
  - discount_percent (numeric, default 0)
  - coupon_code (text, nullable)
  - total (numeric)
  - status (text, default 'pending')
  - created_at (timestamptz)
```

RLS policy: Public INSERT allowed (no auth needed since customers order via chat). SELECT restricted.

### 2. Edge Function: `clerk-chat/index.ts` — System Prompt Update
Clerk ke system prompt mein naya "Order Flow" capability add karenge:

**New Capability: Order Through Chat**
- Jab user koi product select kare ya bole "I want to buy this", clerk order mode mein jaayega
- Clerk ek-ek karke ye details poochega:
  1. Product confirm karo (color, size, quantity)
  2. Agar multiple products hain, sab ke liye ek-ek karke details lo
  3. Customer name
  4. Email address
  5. Phone number
  6. Delivery address
- Sab details milne ke baad, clerk order summary dikhayega aur confirmation maangega
- User ke confirm karne par, clerk ye action trigger karega:

```
---PLACE_ORDER---
{"customer": {"name": "...", "email": "...", "phone": "...", "address": "..."},
 "items": [{"productId": "1", "name": "...", "price": 899, "color": "Navy", "size": "M", "quantity": 1}],
 "coupon": {"code": "BDAY-20", "discount": 20}}
---END_ORDER---
```

### 3. Frontend: `AIClerk.tsx` — Process Order Action
`processActions` function mein naya `PLACE_ORDER` action handler add karenge:

- `---PLACE_ORDER---` block detect karke JSON parse karega
- Supabase `orders` table mein INSERT karega (subtotal, discount, total calculate karke)
- Success/failure message show karega
- Cart clear karega (optional)

### 4. Frontend: `AIClerk.tsx` — Render Order Confirmation
`renderContent` function mein order-related action blocks ko clean display mein convert karenge:
- `---PLACE_ORDER---` block ko "Order placed successfully!" message mein replace karenge

---

## Technical Details

### File: `supabase/functions/clerk-chat/index.ts`
- System prompt mein new section add karna (after Haggle Mode, before Important Rules):
  - "### 7. Order Through Chat" — complete ordering instructions for the AI
  - AI ko batana ke conversationally details collect kare, rush na kare
  - Multiple products ke liye bari bari details le
  - Final summary dikhaye with all items, prices, discount if any
  - User confirm kare tab hi `---PLACE_ORDER---` trigger kare

### File: `src/components/AIClerk.tsx`
- `processActions` mein naya regex pattern: `---PLACE_ORDER---` 
- Parse karke Supabase `orders` table mein insert
- `renderContent` mein order block ko success message mein replace

### Database Migration
- Create `orders` table with columns listed above
- Add RLS policy for public insert (anon can insert orders)
- Read access restricted (only service role)
