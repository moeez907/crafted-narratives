import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { products } from "@/data/products";

const SEED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-products`;

/**
 * Auto-seeds all 220 products into the database if the DB count is lower.
 * Runs once on app startup.
 */
export function useAutoSeedProducts() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        // Check current DB product count
        const { count, error } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true });

        if (error) {
          console.warn("Auto-seed: couldn't check DB count", error);
          return;
        }

        const localCount = products.length;
        console.log(`Auto-seed: DB has ${count} products, local has ${localCount}`);

        if ((count ?? 0) >= localCount) {
          console.log("Auto-seed: DB is up to date, skipping.");
          return;
        }

        console.log(`Auto-seed: Seeding ${localCount} products...`);

        const resp = await fetch(SEED_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ products }),
        });

        if (!resp.ok) {
          console.error("Auto-seed: Failed", await resp.text());
          return;
        }

        const result = await resp.json();
        console.log("Auto-seed: Complete!", result);
      } catch (e) {
        console.error("Auto-seed: Error", e);
      }
    })();
  }, []);
}
