

## Fix Product Image Mismatches

### Problem
The Rain Boots product (and potentially others) are showing incorrect images that don't match their product titles. Specifically, Rain Boots shows a denim shorts image.

### Confirmed Mismatches

1. **Rain Boots** (id 315, `shoes.ts` line 20)
   - Current image: `photo-1591195853828-11db59a44f6b` (shows denim shorts)
   - Fix: Replace with a verified rain boots / wellington boots image
   - Also fix Navy and Red color variant images that reuse boot images from other products

### Approach

1. Update `src/data/products/shoes.ts` -- replace Rain Boots main image and colorImages with verified Unsplash rain boot / wellington boot photos
2. Do a broader visual audit by browsing the live preview across all categories to identify any other remaining mismatches
3. Clear the database (`DELETE FROM products`) so the auto-seed hook repopulates with corrected data

### Technical Details

**Files to modify:**
- `src/data/products/shoes.ts` (line 20) -- Rain Boots image URLs

**Database action:**
- Execute `DELETE FROM products;` to trigger re-seed with corrected images

**Verified replacement Unsplash IDs for Rain Boots:**
- Hunter Green: `photo-1560343090-f0409e92791a` or similar boot image
- Navy / Black / Red variants: verified boot-specific images

After fixing, a full visual check of each category should be performed in the preview to catch any remaining issues.

