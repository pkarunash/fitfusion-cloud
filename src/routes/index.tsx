import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Dumbbell, FlaskConical, ShieldCheck, Truck } from "lucide-react";
import heroImg from "@/assets/hero-gym.jpg";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";
import { inr } from "@/hooks/useCart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IronForge Gym — Protein, Equipment & Membership Fees" },
      {
        name: "description",
        content:
          "Train at IronForge Gym. Buy whey protein and home-gym equipment, view membership fee plans, and chat live with our coaches.",
      },
      { property: "og:title", content: "IronForge Gym — Protein, Equipment & Membership Fees" },
      {
        property: "og:description",
        content: "Protein, equipment and membership plans from IronForge Gym, with live coach chat.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,category,brand,price,mrp,rating,rating_count,stock,images")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("id,name,duration_months,price,original_price,is_popular")
        .eq("is_active", true)
        .order("sort_order")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Athlete deadlifting in the IronForge Gym training floor"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-3 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            Gym · Store · Coaching
          </p>
          <h1 className="max-w-3xl text-5xl leading-none md:text-7xl">
            Lift heavier. Fuel smarter. <span className="text-primary">Pay less.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Certified protein, pro-grade equipment and transparent membership fees — plus a live chat line straight to
            your coach.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/shop" className="btn-primary glow">
              Shop the store <ArrowRight className="size-4" />
            </Link>
            <Link to="/plans" className="btn-outline">
              View fee structure
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
        {[
          { icon: FlaskConical, title: "Lab tested", text: "Every batch verified" },
          { icon: Truck, title: "2-day delivery", text: "Free over ₹1,499" },
          { icon: ShieldCheck, title: "2-yr warranty", text: "On all equipment" },
          { icon: Dumbbell, title: "Coach support", text: "Chat any time" },
        ].map((f) => (
          <div key={f.title} className="surface-card p-4">
            <f.icon className="mb-2 size-5 text-primary" />
            <p className="font-display text-lg leading-tight">{f.title}</p>
            <p className="text-xs text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-3xl md:text-4xl">Top picks</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(products ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-3xl md:text-4xl">Membership fees</h2>
          <Link to="/plans" className="text-sm font-semibold text-primary">
            Full breakdown
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <div
              key={plan.id}
              className={`surface-card p-5 ${plan.is_popular ? "border-primary glow" : ""}`}
            >
              <p className="font-display text-2xl">{plan.name}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {plan.duration_months} month{plan.duration_months > 1 ? "s" : ""}
              </p>
              <p className="mt-3 font-display text-4xl text-primary">{inr(Number(plan.price))}</p>
              {plan.original_price && (
                <p className="text-sm text-muted-foreground line-through">{inr(Number(plan.original_price))}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
