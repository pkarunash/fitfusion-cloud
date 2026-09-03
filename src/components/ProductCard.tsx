import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { cld } from "@/lib/cloudinary";
import { inr } from "@/hooks/useCart";

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string | null;
  price: number;
  mrp: number | null;
  rating: number;
  rating_count: number;
  stock: number;
  images: string[];
};

export function ProductThumb({ product, size = 400 }: { product: Pick<Product, "name" | "images">; size?: number }) {
  const src = product.images?.[0];
  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center bg-surface-2">
        <span className="font-display text-3xl text-muted-foreground">{product.name.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={cld(src, size)}
      alt={product.name}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  const off = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group surface-card overflow-hidden transition-colors hover:border-primary/60"
    >
      <div className="relative aspect-square overflow-hidden">
        <ProductThumb product={product} />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {off}% off
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute right-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
            Sold out
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand ?? product.category}</p>
        <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug">{product.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5 rounded bg-success/20 px-1.5 py-0.5 font-bold text-success">
            {product.rating}
            <Star className="size-3 fill-current" />
          </span>
          <span>({product.rating_count})</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-xl">{inr(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-muted-foreground line-through">{inr(product.mrp)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
