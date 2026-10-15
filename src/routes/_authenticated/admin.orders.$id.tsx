import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira, dt, statusLabel, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/format";
import { friendlyError, usePerms } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — Zaytun Admin" }, { name: "description", content: "Full order details." }, { property: "og:title", content: "Order — Zaytun Admin" }, { property: "og:description", content: "Full order details." }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { can } = usePerms();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const [o, h] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
        supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
      ]);
      const email = o.data ? (await supabase.from("profiles").select("email,full_name").eq("id", o.data.user_id).maybeSingle()).data : null;
      return { o: o.data, history: h.data ?? [], customer: email };
    },
  });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const o = data?.o;
  if (!o) return <p>Order not found. <Link to="/admin/orders" className="text-primary">Back</Link></p>;

  const update = async (patch: { status?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;

  return (
    <div className="space-y-5">
      <Link to="/admin/orders" className="text-sm text-muted-foreground">← All orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order {o.reference}</h1>
          <p className="text-sm text-muted-foreground">Placed {dt(o.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select disabled={!can("orders")} value={o.status} onChange={(e) => update({ status: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-sm">
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
          <select disabled={!can("orders")} value={o.payment_status} onChange={(e) => update({ payment_status: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-sm capitalize">
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>Payment {s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h3 className="mb-2 font-semibold">Products</h3>
          {o.order_items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 border-b py-2 text-sm last:border-0">
              {i.image && <img src={i.image} alt="" className="h-10 w-10 rounded object-cover" />}
              <div className="flex-1">
                {i.product_id ? <Link to="/admin/products" className="font-medium hover:text-primary">{i.name}</Link> : i.name}
                <div className="text-xs text-muted-foreground">{i.color ? `Colour: ${i.color} · ` : ""}{i.quantity} × {naira(i.price)}</div>
              </div>
              <span className="font-semibold">{naira(Number(i.price) * i.quantity)}</span>
            </div>
          ))}
          <div className="mt-3 border-t pt-2">
            {row("Subtotal", naira(o.subtotal))}
            {row("Discount" + (o.coupon_code ? ` (${o.coupon_code})` : ""), "−" + naira(o.discount))}
            {row("Shipping", naira(o.shipping))}
            {row("Tax", "Included")}
            <div className="flex justify-between pt-1 font-display text-lg font-bold"><span>Total</span><span>{naira(o.total)}</span></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Customer</h3>
            <Link to="/admin/customers/$id" params={{ id: o.user_id }} className="font-medium text-primary">{data?.customer?.full_name || o.shipping_name}</Link>
            <p className="text-sm text-muted-foreground">{data?.customer?.email}</p>
            <p className="text-sm">{o.phone}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm">
            <h3 className="mb-2 font-semibold">Delivery & billing address</h3>
            <p>{o.shipping_name}</p><p>{o.address}</p><p>{o.city}, {o.state}</p>
            {o.notes && <p className="mt-2 text-muted-foreground">Note: {o.notes}</p>}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Payment</h3>
            {row("Method", o.payment_method === "cod" ? "Pay on delivery" : "Bank transfer")}
            {row("Reference", o.reference)}
            {row("Status", <span className="capitalize">{o.payment_status}</span>)}
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 font-semibold">History</h3>
        {data?.history.map((h) => (
          <div key={h.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm last:border-0">
            <span>{h.field === "payment" ? "Payment" : "Status"}: {h.old_value ? `${statusLabel[h.old_value] ?? h.old_value} → ` : ""}<b>{statusLabel[h.new_value] ?? h.new_value}</b></span>
            <span className="text-muted-foreground">{h.changed_by_email ?? (h.old_value ? "System" : "Customer")} · {dt(h.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
