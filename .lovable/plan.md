

# Fix: AI Clerk Trousers Not Showing + Full Catalog Access

## Problem Identified

Database mein 19 trousers hain aur sab ki embeddings bhi hain (207 products, 207 embeddings). Lekin AI Clerk trousers nahi dikha raha kyunke:

1. **Catalog limit 100 hai** — Line 117 mein `.limit(100)` hai lekin DB mein 207 products hain. Trousers (IDs 9, 901-918) cut ho sakte hain.
2. **Vector search kaam kar raha hai** lekin djb2 hash embeddings simple queries ke liye low similarity scores dete hain — kuch products threshold se neeche aa sakte hain.

## Plan

### Step 1: Increase catalog limit to 250
`supabase/functions/clerk-chat/index.ts` line 117 mein `.limit(100)` ko `.limit(250)` karna hai taake saare 207 products clerk ko dikhen.

### Step 2: Add category-based fallback search
Vector search ke baad, agar user ne koi specific category maangi (jaise "trousers") aur vector results mein us category ke products kam hain, to ek additional category-based query run karein:
```
SELECT * FROM products WHERE category ILIKE '%trousers%'
```
Isse guarantee hoga ke category ke saare products milein.

### Step 3: UI_ACTION search value improvement  
System prompt mein clarify karna ke jab user specific category maange (jaise trousers), to `UI_ACTION` ka search value exact category name ho (e.g., `"Trousers"`) taake homepage grid bhi sahi filter ho.

### Step 4: Deploy and test
Edge function deploy karke "I want trousers" query test karna.

---

### Technical Details

**File: `supabase/functions/clerk-chat/index.ts`**

1. Line 117: `.limit(100)` -> `.limit(250)`

2. Lines 84-110 ke baad: Add category fallback logic:
   - Extract category keywords from user message
   - If vector results have fewer than 3 items from that category, run a direct `WHERE category ILIKE` query
   - Merge and deduplicate results

3. System prompt update: Add instruction that for category-specific queries, the `UI_ACTION` search value should be the exact category name (e.g., "Trousers", "Shoes", "Watches").

