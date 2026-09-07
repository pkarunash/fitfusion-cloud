import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cld } from "@/lib/cloudinary";
import { inr, useCart } from "@/hooks/useCart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | World Gym Store" },
      { name: "description", content: "Review your protein, equipment and accessory order before checkout." },
      { property: "og:title", content: "Your Cart | World Gym Store" },
      { property: "og:description", content: "Review your World Gym store order." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQty, remove, clear } = useCart();
  const shipping = subtotal === 0 || subtotal >= 1499 ? 0 : 99;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Stock up on protein or grab new equipment.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-4xl">Cart</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.id} className="surface-card flex gap-3 p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {l.image ? (
                  <img src={cld(l.image, 200)} alt={l.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-display text-xl text-muted-foreground">
                    {l.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold">{l.name}</p>
                <p className="font-display text-xl text-primary">{inr(l.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setQty(l.id, l.qty - 1)} className="btn-outline px-2 py-1" aria-label="Decrease">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center font-bold">{l.qty}</span>
                  <button onClick={() => setQty(l.id, l.qty + 1)} className="btn-outline px-2 py-1" aria-label="Increase">
                    <Plus className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="ml-auto rounded-lg p-2 text-destructive hover:bg-muted"
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="surface-card h-fit p-4">
          <h2 className="text-2xl">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{inr(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{shipping === 0 ? "Free" : inr(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-2xl">
              <dt>Total</dt>
              <dd className="text-primary">{inr(subtotal + shipping)}</dd>
            </div>
          </dl>
          <button
            onClick={() => {
              toast.success("Order placed! Our team will confirm on chat.");
              clear();
            }}
            className="btn-primary mt-4 w-full"
          >
            Place order
          </button>
          <Link to="/shop" className="btn-outline mt-2 w-full">
            Add more items
          </Link>
        </aside>
      </div>
    </div>
  );
}
