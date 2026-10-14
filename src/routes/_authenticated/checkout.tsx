import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { NG_STATES, naira, shippingFor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Zaytun Digital Tech Store" },
      { name: "description", content: "Enter delivery details and place your order." },
      { property: "og:title", content: "Checkout — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Secure checkout." },
    ],
  }),
  component: Checkout,
});

const shipSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number"),
  address: z.string().trim().min(5, "Enter your street address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(100),
  state: z.string().min(2, "Choose a state"),
  notes: z.string().max(500).optional(),
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", address: "", city: "", state: "Lagos", notes: "" });
  const [pay, setPay] = useState<"cod" | "bank_transfer">("cod");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; percent_off: number; min_order: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const discount = coupon && subtotal >= coupon.min_order ? Math.round((subtotal * coupon.percent_off) / 100) : 0;
  const shipping = shippingFor(f.state, subtotal - discount);
  const total = subtotal - discount + shipping;

  const applyCoupon = async () => {
    const { data } = await supabase.rpc("check_coupon", { _code: code });
    const c = data?.[0];
    if (!c) return toast.error("Invalid coupon");
    if (subtotal < Number(c.min_order)) return toast.error(`Minimum order is ${naira(c.min_order)}`);
    setCoupon({ code: c.code, percent_off: c.percent_off, min_order: Number(c.min_order) });
    toast.success(`${c.percent_off}% discount applied`);
  };

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = shipSchema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      _items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, color: i.color ?? null })),
      _ship: parsed.data,
      _coupon: coupon?.code ?? "",
      _payment_method: pay,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    clear();
    nav({ to: "/order/$id", params: { id: data[0].order_id } });
  };

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p>Your cart is empty.</p>
        <Link to="/shop" className="mt-4 inline-block text-primary">Continue shopping</Link>
      </div>
    );

  const field = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm";
  return (
    <form onSubmit={place} className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-5">
      <div className="space-y-6 md:col-span-3">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Delivery details</h2>
          <input className={field} placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={field} placeholder="Phone (e.g. 08031234567)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className={field} placeholder="Street address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            <select className={field} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>
              {NG_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <textarea className={field} placeholder="Delivery notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </section>
        <section className="space-y-2 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Payment method</h2>
          {[
            ["cod", "Pay on delivery", "Pay with cash, transfer or POS when your order arrives."],
            ["bank_transfer", "Bank transfer", "Transfer to our account; we confirm and ship."],
          ].map(([v, t, d]) => (
            <label key={v} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${pay === v ? "border-primary bg-secondary" : ""}`}>
              <input type="radio" checked={pay === v} onChange={() => setPay(v as "cod")} className="mt-1 accent-primary" />
              <span><span className="block text-sm font-semibold">{t}</span><span className="text-xs text-muted-foreground">{d}</span></span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Card payments with Paystack are coming soon.</p>
        </section>
      </div>
      <aside className="h-fit space-y-3 rounded-xl border bg-card p-5 shadow-card md:col-span-2">
        <h2 className="font-semibold">Order summary</h2>
        {items.map((i) => (
          <div key={i.product_id + (i.color ?? "")} className="flex justify-between gap-2 text-sm">
            <span className="line-clamp-1">{i.quantity}× {i.name}</span>
            <span>{naira(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={applyCoupon} className="rounded-lg border px-3 text-sm font-semibold">Apply</button>
        </div>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-success"><span>Discount ({coupon?.code})</span><span>-{naira(discount)}</span></div>}
          <div className="flex justify-between"><span>Delivery ({f.state})</span><span>{shipping === 0 ? "Free" : naira(shipping)}</span></div>
          <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span className="text-primary">{naira(total)}</span></div>
        </div>
        <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
