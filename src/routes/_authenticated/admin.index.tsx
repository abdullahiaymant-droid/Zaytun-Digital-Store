import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { naira, statusLabel, CLOSED_STATUSES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Zaytun Admin" }, { name: "description", content: "Store overview." }, { property: "og:title", content: "Dashboard — Zaytun Admin" }, { property: "og:description", content: "Store overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [o, p, c] = await Promise.all([
        supabase.from("orders").select("id,reference,total,status,created_at,shipping_name"),
        supabase.from("products").select("id,name,stock,low_stock_threshold"),
        supabase.from("profiles").select("id,created_at"),
      ]);
      if (o.error) throw o.error;
      return { orders: o.data ?? [], products: p.data ?? [], customers: c.data ?? [] };
    },
  });
  if (isLoading) return <p className="text-muted-foreground">Loading dashboard…</p>;
  if (error || !data) return <p className="text-destructive">Could not load the dashboard. Please refresh.</p>;
  const now = new Date();
  const today = now.toDateString();
  const sameMonth = (s: string) => { const x = new Date(s); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); };
  const live = data.orders.filter((o) => !CLOSED_STATUSES.includes(o.status));
  const sum = (a: typeof live) => a.reduce((s, o) => s + Number(o.total), 0);
  const low = data.products.filter((p) => p.stock > 0 && p.stock <= p.low_stock_threshold);
  const out = data.products.filter((p) => p.stock === 0);
  const weekAgo = Date.now() - 7 * 864e5;
  const stats: [string, string | number][] = [
    ["Total revenue", naira(sum(live))],
    ["Today's revenue", naira(sum(live.filter((o) => new Date(o.created_at).toDateString() === today)))],
    ["This month", naira(sum(live.filter((o) => sameMonth(o.created_at))))],
    ["Total orders", data.orders.length],
    ["Pending orders", data.orders.filter((o) => o.status === "pending").length],
    ["Completed orders", data.orders.filter((o) => o.status === "delivered").length],
    ["Cancelled orders", data.orders.filter((o) => CLOSED_STATUSES.includes(o.status)).length],
    ["Total customers", data.customers.length],
    ["New customers (7 days)", data.customers.filter((c) => new Date(c.created_at).getTime() > weekAgo).length],
    ["Total products", data.products.length],
    ["Low stock", low.length],
    ["Out of stock", out.length],
  ];
  const recent = [...data.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 font-display text-2xl font-bold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold">Recent orders</h3>
          {recent.map((o) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="flex justify-between border-b py-2 text-sm last:border-0 hover:text-primary">
              <span>{o.reference} · {o.shipping_name} · <span className="text-muted-foreground">{statusLabel[o.status] ?? o.status}</span></span><span>{naira(o.total)}</span>
            </Link>
          ))}
          {!recent.length && <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold">Stock alerts</h3>
          {[...out, ...low].map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{p.name}</span><span className="font-semibold text-destructive">{p.stock === 0 ? "Out" : p.stock}</span></div>
          ))}
          {!low.length && !out.length && <p className="mt-2 text-sm text-muted-foreground">All products well stocked.</p>}
        </div>
      </div>
    </div>
  );
}
