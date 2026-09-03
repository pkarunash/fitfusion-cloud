import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";

const categories = [
  { key: "all", label: "All" },
  { key: "protein", label: "Protein & Supplements" },
  { key: "equipment", label: "Equipment" },
  { key: "accessory", label: "Accessories" },
] as const;

const sorts = [
  { key: "popular", label: "Popularity" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
] as const;

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Store — Protein & Gym Equipment | IronForge Gym" },
      {
        name: "description",
        content:
          "Browse whey protein, mass gainers, creatine, dumbbells, racks and gym accessories with full specifications and member pricing.",
      },
      { property: "og:title", content: "Store — Protein & Gym Equipment | IronForge Gym" },
      {
        property: "og:description",
        content: "Protein powders, equipment and accessories with detailed specifications.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("popular");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", category, sort],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,name,slug,category,brand,price,mrp,rating,rating_count,stock,images")
        .eq("is_active", true);
      if (category !== "all") query = query.eq("category", category);
      if (sort === "low") query = query.order("price", { ascending: true });
      else if (sort === "high") query = query.order("price", { ascending: false });
      else query = query.order("rating_count", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const products = (data ?? []).filter((p) =>
    q.trim() ? `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-4xl">Store</h1>

      <div className="sticky top-16 z-30 -mx-4 mt-4 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search protein, dumbbells, belts…"
            className="field pl-9"
            aria-label="Search products"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                category === c.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-2 text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
          </span>
          {sorts.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                sort === s.key ? "border-accent text-accent" : "border-border bg-surface-2 text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="surface-card h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No products match that search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
