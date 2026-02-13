

## Comprehensive Product Image Mismatch Fix

### Problem
Product images across the store are mismatched with their titles. The root cause is a small pool of Unsplash photo IDs being reused across unrelated products. This is most severe in the Shoes category but affects others too.

### Confirmed Mismatches (Shoes Category - Visual Audit)

| Product | Issue |
|---------|-------|
| **Monk Strap Shoes** (id 301) | Shows a colorful knit/running shoe under neon lights -- should show buckled monk strap dress shoes |
| **Patent Leather Evening Shoes** (id 306) | Shows colorful floral HIGH HEELS -- should show men's black patent leather formal shoes |
| **Suede Driving Moccasins** (id 305) | Image shows driving gloves/leather boots -- should show soft suede loafer-style moccasins |
| **Velvet Slippers** (id 310) | Shows a generic shoe/sneaker -- should show velvet embroidered slippers |
| **Leather Sandals** (id 311) | Shows Birkenstock-style sandals (same image as Espadrille Sandals) -- should show Greek-style leather sandals |
| **Espadrille Sandals** (id 308) | Shows Birkenstock sandals -- should show jute-soled espadrilles |
| **Riding Boots** (id 313) | Reuses the Hiking Boots image -- should show tall equestrian riding boots |
| **Tassel Loafers** (id 314) | Image appears broken/not loading |
| **Leather High-Top Sneakers** (id 316) | Shows pastel Nike sneakers -- should show premium leather high-tops |
| **Woven Leather Loafers** (id 318) | Shows driving-style shoes -- should show intrecciato woven leather |
| **Derby Brogue Shoes** (id 304) | Reuses same image as Leather Oxford -- should show distinct brogue pattern |
| **Leather Oxford Shoes** (id 3) | Shows monk strap buckled shoes -- should show laced oxfords |

### Cross-Category Issues
Many categories share the same Unsplash IDs for color variants, causing visual duplication. For example, `photo-1604671801908-6f0c6a092c05` appears in multiple shoe products for different color variants but shows a single type of shoe.

### Approach

1. Replace all mismatched main images in `shoes.ts` with verified, category-accurate Unsplash photo IDs
2. Replace mismatched colorImages variants with unique, accurate images per color
3. Spot-check and fix any cross-category reuse issues in other files
4. Clear the database (`DELETE FROM products`) so the auto-seed repopulates with corrected data
5. Visual verification across all categories after re-seed

### Technical Details

**Files to modify:**
- `src/data/products/shoes.ts` -- Primary target: replace ~12 product main images and ~30+ color variant images with verified, product-accurate Unsplash URLs

**Verified replacement strategy:**
Each product will get unique Unsplash images that accurately depict:
- The correct shoe type (oxford vs monk strap vs brogue, etc.)
- Appropriate style (men's formal vs women's heels, etc.)
- Distinct images per color variant where possible

**Database action:**
- Execute `DELETE FROM products;` to clear current data and trigger auto-seed with corrected images

**Scope:** Focused on the Shoes category first (most severe mismatches), with a follow-up visual audit on other categories after deployment.

