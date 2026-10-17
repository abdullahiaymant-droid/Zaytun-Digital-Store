import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { naira, statusLabel, TRACK_STEPS, CLOSED_STATUSES } from "@/lib/format";
import { BankDetails } from "@/components/BankDetails";
import { waLink } from "@/lib/payment";

export const Route = createFileRoute("/_authenticated/order/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Zaytun Digital Tech Store" },
      { name: "description", content: "Track the status of your order." },
      { property: "og:title", content: "Order — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Track your order." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data: o, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()).data,
  });
  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!o) return <div className="mx-auto max-w-3xl px-4 py-16">Order not found.</div>;
  const steps = TRACK_STEPS;
  const idx = steps.indexOf(o.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl bg-ink-gradient p-6 text-ink-foreground">
        <CheckCircle2 className="h-8 w-8 text-gold" />
        <h1 className="mt-2 text-2xl font-bold">Order {o.reference}</h1>
        <p className="text-sm opacity-80">Placed {new Date(o.created_at).toLocaleString("en-NG")}</p>
      </div>

      {CLOSED_STATUSES.includes(o.status) ? (
        <p className="mt-6 rounded-lg bg-destructive/10 p-3 text-destructive">This order was {statusLabel[o.status]?.toLowerCase()}.</p>
      ) : (
        <ol className="mt-6 grid grid-cols-7 gap-1 text-center text-[11px]">
          {steps.map((s, i) => (
            <li key={s}>
              <div className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              <span className={`mt-1 block ${i <= idx ? "font-semibold" : "text-muted-foreground"}`}>{statusLabel[s]}</span>
            </li>
          ))}
        </ol>
      )}

      {o.payment_method === "bank_transfer" && o.payment_status === "pending" && (
        <div className="mt-6 space-y-3 rounded-xl border border-gold bg-secondary p-4">
          <p className="font-semibold">Payment awaiting confirmation</p>
          <p className="text-sm text-muted-foreground">If you haven't paid yet, transfer to the account below. We confirm and ship once payment is received.</p>
          <BankDetails amount={Number(o.total)} reference={o.reference} />
          <a
            href={waLink(`Hello, I have paid ${naira(o.total)} for order ${o.reference}. Here is my receipt:`)}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground"
          >
            Send payment receipt on WhatsApp
          </a>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-card p-5">
        {o.order_items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 border-b py-3 last:border-0">
            {i.image && <img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
            <span className="flex-1 text-sm">{i.quantity}× {i.name}{i.color ? ` · ${i.color}` : ""}</span>
            <span className="text-sm font-medium">{naira(Number(i.price) * i.quantity)}</span>
          </div>
        ))}
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{naira(o.subtotal)}</span></div>
          {Number(o.discount) > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{naira(o.discount)}</span></div>}
          <div className="flex justify-between"><span>Delivery</span><span>{naira(o.shipping)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{naira(o.total)}</span></div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="font-semibold">Delivery to</div>
          <p className="mt-1 text-muted-foreground">{o.shipping_name}, {o.phone}<br />{o.address}, {o.city}, {o.state}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="font-semibold">Payment</div>
          <p className="mt-1 capitalize text-muted-foreground">{o.payment_method === "cod" ? "Pay on delivery" : "Bank transfer"} · {o.payment_status}</p>
        </div>
      </div>
      <Link to="/account" className="mt-6 inline-block text-sm font-semibold text-primary">← All my orders</Link>
    </div>
  );
}
