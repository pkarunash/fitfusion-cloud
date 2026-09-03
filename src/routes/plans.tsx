import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/hooks/useCart";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Membership Fee Structure | IronForge Gym" },
      {
        name: "description",
        content:
          "Transparent IronForge Gym membership fees: monthly, quarterly and annual plans with classes, personal training and store discounts.",
      },
      { property: "og:title", content: "Membership Fee Structure | IronForge Gym" },
      { property: "og:description", content: "Monthly, quarterly and annual gym membership pricing." },
    ],
  }),
  component: Plans,
});

function Plans() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["plans", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl md:text-5xl">Fee structure</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        No joining fee, no hidden charges. Pick a term, cancel any time before renewal.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="surface-card h-80 animate-pulse" />)}
        {(plans ?? []).map((plan) => {
          const price = Number(plan.price);
          const original = plan.original_price ? Number(plan.original_price) : null;
          const monthly = plan.duration_months > 0 ? Math.round(price / plan.duration_months) : price;
          return (
            <div key={plan.id} className={`surface-card flex flex-col p-5 ${plan.is_popular ? "border-primary glow" : ""}`}>
              {plan.is_popular && (
                <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
                  <Sparkles className="size-3" /> Best value
                </span>
              )}
              <h2 className="text-2xl">{plan.name}</h2>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {plan.duration_months} month{plan.duration_months > 1 ? "s" : ""}
              </p>
              <p className="mt-4 font-display text-4xl text-primary">{inr(price)}</p>
              <p className="text-sm text-muted-foreground">
                {original && <span className="line-through">{inr(original)}</span>} · {inr(monthly)}/month
              </p>
              {plan.description && <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {(plan.features ?? []).map((f: string) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/chat" className="btn-primary mt-5">
                Enquire now
              </Link>
            </div>
          );
        })}
      </div>

      <div className="surface-card mt-10 p-5">
        <h2 className="text-2xl">What every membership includes</h2>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          {[
            "Strength floor, cardio zone and functional rig",
            "Free WiFi, showers and locker rooms",
            "Induction session with a certified trainer",
            "Access 5:00 am – 11:00 pm, all 7 days",
          ].map((t) => (
            <p key={t} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
