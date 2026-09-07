import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ShoppingCart, Star, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cld } from "@/lib/cloudinary";
import { inr, useCart } from "@/hooks/useCart";

type Spec = { label: string; value: string };

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | World Gym Store` },
      {
        name: "description",
        content: "Full specifications, pricing and stock for this World Gym store product.",
      },
      { property: "og:title", content: "World Gym Store product" },
      { property: "og:description", content: "Specifications, pricing and availability." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const [active, setActive] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10 text-muted-foreground">Loading…</div>;
  if (!product)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-3xl">Product not found</h1>
        <Link to="/shop" className="btn-primary mt-6">
          Back to store
        </Link>
      </div>
    );

  const images = (product.images ?? []) as string[];
  const specs = (product.specifications ?? []) as unknown as Spec[];
  const price = Number(product.price);
  const mrp = product.mrp ? Number(product.mrp) : null;
  const off = mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="surface-card aspect-square overflow-hidden">
            {images[active] ? (
              <img src={cld(images[active], 900)} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center bg-surface-2 font-display text-6xl text-muted-foreground">
                {product.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActive(i)}
                  className={`size-16 overflow-hidden rounded-lg border ${i === active ? "border-primary" : "border-border"}`}
                >
                  <img src={cld(img, 160)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.brand} · {product.category}
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 rounded bg-success/20 px-2 py-0.5 font-bold text-success">
              {product.rating} <Star className="size-3 fill-current" />
            </span>
            <span className="text-muted-foreground">{product.rating_count} ratings</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="font-display text-5xl text-primary">{inr(price)}</span>
            {mrp && mrp > price && (
              <>
                <span className="text-lg text-muted-foreground line-through">{inr(mrp)}</span>
                <span className="pb-1 text-sm font-bold text-accent">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Truck className="size-4" /> Delivered in 2–4 days ·{" "}
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-6 flex gap-3">
            <button
              disabled={product.stock === 0}
              onClick={() => {
                cart.add({ id: product.id, name: product.name, price, image: images[0] ?? null });
                toast.success("Added to cart");
              }}
              className="btn-primary flex-1"
            >
              <ShoppingCart className="size-4" /> Add to cart
            </button>
            <Link to="/cart" className="btn-outline flex-1">
              Go to cart
            </Link>
          </div>

          <div className="surface-card mt-6 p-4">
            <h2 className="mb-3 text-2xl">Specifications</h2>
            <dl className="divide-y divide-border">
              {specs.map((s) => (
                <div key={s.label} className="flex gap-4 py-2 text-sm">
                  <dt className="w-40 shrink-0 text-muted-foreground">{s.label}</dt>
                  <dd className="font-semibold">{s.value}</dd>
                </div>
              ))}
              {specs.length === 0 && <p className="text-sm text-muted-foreground">No specifications listed yet.</p>}
            </dl>
          </div>

          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {["100% genuine, sealed stock", "7-day easy replacement", "Member discount applied at checkout"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
