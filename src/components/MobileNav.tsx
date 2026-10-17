import { Link } from "@tanstack/react-router";
import { Home, Store, ShoppingCart, User, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart";
import { waLink } from "@/lib/payment";

export function MobileNav() {
  const { items } = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const cls = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground";
  const active = { className: "text-primary font-semibold" };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur md:hidden">
      <Link to="/" className={cls} activeProps={active} activeOptions={{ exact: true }}><Home className="h-5 w-5" />Home</Link>
      <Link to="/shop" className={cls} activeProps={active}><Store className="h-5 w-5" />Shop</Link>
      <Link to="/cart" className={`${cls} relative`} activeProps={active}>
        <ShoppingCart className="h-5 w-5" />Cart
        {count > 0 && <span className="absolute right-[28%] top-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{count}</span>}
      </Link>
      <Link to="/account" className={cls} activeProps={active}><User className="h-5 w-5" />Account</Link>
    </nav>
  );
}

export function WhatsAppButton() {
  return (
    <a
      href={waLink("Hello Zaytun Digital Tech Store, I need help with")}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
