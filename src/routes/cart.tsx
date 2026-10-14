import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Zaytun Digital Tech Store" },
      { name: "description", content: "Review the items in your cart and proceed to checkout." },
      { property: "og:title", content: "Cart — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Review your cart." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/shop" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Start shopping</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          {items.map((i) => (
            <div key={i.product_id + (i.color ?? "")} className="flex gap-3 rounded-xl border bg-card p-3">
              <img src={i.image} alt={i.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to="/product/$slug" params={{ slug: i.slug }} className="font-medium">{i.name}</Link>
                {i.color && <span className="text-xs text-muted-foreground">{i.color}</span>}
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border">
                    <button className="p-1.5" onClick={() => setQty(i.product_id, i.color, i.quantity - 1)} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm">{i.quantity}</span>
                    <button className="p-1.5" onClick={() => setQty(i.product_id, i.color, i.quantity + 1)} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="font-semibold">{naira(i.price * i.quantity)}</span>
                </div>
              </div>
              <button onClick={() => remove(i.product_id, i.color)} className="self-start p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="h-fit rounded-xl border bg-card p-5 shadow-card">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{naira(subtotal)}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">Delivery and coupons are applied at checkout.</p>
          <Link to="/checkout" className="mt-4 block rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground">Checkout</Link>
        </div>
      </div>
    </div>
  );
}
