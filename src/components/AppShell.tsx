import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, Home, MessageCircle, ShoppingCart, Store, IdCard, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shop", label: "Store", icon: Store },
  { to: "/plans", label: "Fees", icon: IdCard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="size-5" />
            </span>
            <span className="font-display text-2xl leading-none">
              Iron<span className="text-primary">Forge</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {navItems.slice(0, 4).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/cart" className="relative rounded-lg p-2 hover:bg-muted" aria-label="Cart">
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link to="/admin" className="rounded-lg p-2 hover:bg-muted md:hidden" aria-label="Admin">
                <Shield className="size-5" />
              </Link>
            )}
            {user ? (
              <button onClick={() => signOut()} className="btn-outline px-3 py-2 text-sm" aria-label="Sign out">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <Link to="/auth" className="btn-primary px-4 py-2 text-sm">
                Join
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 hidden border-t border-border py-8 text-center text-sm text-muted-foreground md:block">
        IronForge Gym · Protein, equipment & memberships · Open 5am–11pm
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <item.icon className="size-5" />
                  {item.to === "/cart" && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
