import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag, User, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";
import { useIsAdmin, useUser } from "@/lib/auth";

const NAV = [
  ["smartphones", "Phones"],
  ["laptops", "Laptops"],
  ["tablets", "Tablets"],
  ["audio", "Audio"],
  ["smart-watches", "Watches"],
  ["gaming", "Gaming"],
  ["networking", "Networking"],
  ["accessories", "Accessories"],
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const { user } = useUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ to: "/shop", search: { q: q || undefined } });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="bg-ink py-1.5 text-center text-xs text-ink-foreground">
        Free delivery on orders over ₦500,000 · Pay on delivery available in Lagos
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Logo />
        <form onSubmit={submit} className="ml-auto hidden flex-1 max-w-md md:flex">
          <div className="flex w-full items-center rounded-lg border bg-card px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search phones, laptops, brands…"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
            />
          </div>
        </form>
        <nav className="ml-auto flex items-center gap-1 md:ml-2">
          {isAdmin && (
            <Link to="/admin" className="rounded-lg p-2 hover:bg-muted" aria-label="Admin">
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          <Link to="/account" className="rounded-lg p-2 hover:bg-muted" aria-label="Wishlist" search={{ tab: "wishlist" }}>
            <Heart className="h-5 w-5" />
          </Link>
          <Link to={user ? "/account" : "/auth"} className="flex items-center gap-1 rounded-lg p-2 text-sm hover:bg-muted" aria-label="Account">
            <User className="h-5 w-5" />
            <span className="hidden lg:inline">{user ? "Account" : "Sign in"}</span>
          </Link>
          <Link to="/cart" className="relative rounded-lg p-2 hover:bg-muted" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
      <form onSubmit={submit} className="px-4 pb-3 md:hidden">
        <div className="flex items-center rounded-lg border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
        </div>
      </form>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2 text-sm font-medium text-muted-foreground">
          <Link to="/shop" className="whitespace-nowrap hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ includeSearch: false }}>All</Link>
          {NAV.map(([slug, label]) => (
            <Link key={slug} to="/shop" search={{ category: slug }} className="whitespace-nowrap hover:text-primary">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm opacity-75">
            Genuine phones, laptops and accessories with warranty, delivered across Nigeria.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-gold">Shop</h4>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/shop" search={{ category: "smartphones" }}>Smartphones</Link></li>
            <li><Link to="/shop" search={{ category: "laptops" }}>Laptops</Link></li>
            <li><Link to="/shop" search={{ category: "audio" }}>Audio</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-gold">Customer care</h4>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/account">Track my order</Link></li>
            <li><Link to="/cart">My cart</Link></li>
            <li>Mon–Sat, 9am–6pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-4 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Zaytun Digital Tech Store. All rights reserved.
      </div>
    </footer>
  );
}
