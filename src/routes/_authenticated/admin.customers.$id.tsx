import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira, d, dt, statusLabel, CLOSED_STATUSES } from "@/lib/format";
import { friendlyError, usePerms } from "@/lib/admin";
import { customersQuery } from "./admin.customers";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  head: () => ({ meta: [{ title: "Customer profile — Zaytun Admin" }, { name: "description", content: "Customer details and orders." }, { property: "og:title", content: "Customer — Zaytun Admin" }, { property: "og:description", content: "Customer details." }] }),
  component: CustomerPage,
});

function CustomerPage() {
  const { id } = Route.useParams();
  const { can } = usePerms();
  const qc = useQueryClient();
  const { data: list = [], isLoading } = useQuery(customersQuery);
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "customer-orders", id],
    queryFn: async () => (await supabase.from("orders").select("id,reference,total,status,payment_status,created_at,address,city,state").eq("user_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const c = list.find((x) => x.id === id);
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!c) return <p>Customer not found. <Link to="/admin/customers" className="text-primary">Back</Link></p>;

  const toggle = async () => {
    if (!confirm(c.disabled ? "Enable this account?" : "Disable this account? They won't be able to sign in or order.")) return;
    const { error } = await supabase.rpc("admin_set_customer_disabled", { _uid: id, _disabled: !c.disabled });
    if (error) return toast.error(friendlyError(error));
    toast.success(c.disabled ? "Account enabled" : "Account disabled");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const addresses = Array.from(new Set(orders.map((o) => `${o.address}, ${o.city}, ${o.state}`)));
  const stats: [string, string | number][] = [
    ["Total orders", orders.length],
    ["Completed", orders.filter((o) => o.status === "delivered").length],
    ["Pending", orders.filter((o) => !CLOSED_STATUSES.includes(o.status) && o.status !== "delivered").length],
    ["Cancelled", orders.filter((o) => CLOSED_STATUSES.includes(o.status)).length],
    ["Total spent", naira(c.total_spent)],
  ];
  const initials = (c.full_name || c.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      <Link to="/admin/customers" className="text-sm text-muted-foreground">← All customers</Link>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">{initials}</div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{c.full_name || "Unnamed customer"}</h1>
          <p className="text-sm text-muted-foreground">{c.email} · {c.phone || "No phone"}</p>
          <p className="text-xs text-muted-foreground">Joined {d(c.created_at)} · Last sign-in {dt(c.last_sign_in)} · Last order {d(c.last_order)}</p>
        </div>
        <span className={c.disabled ? "text-destructive" : "text-success"}>{c.disabled ? "Disabled" : "Active"}</span>
        {can("customers") && <button onClick={toggle} className="rounded-lg border px-3 py-2 text-sm">{c.disabled ? "Enable account" : "Disable account"}</button>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([k, v]) => <div key={k} className="rounded-xl border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">{k}</div><div className="mt-1 font-display text-xl font-bold">{v}</div></div>)}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Delivery addresses</h3>
        {addresses.map((a) => <p key={a} className="border-b py-2 text-sm last:border-0">{a}</p>)}
        {!addresses.length && <p className="mt-2 text-sm text-muted-foreground">No addresses yet.</p>}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Orders</h3>
        {orders.map((o) => (
          <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm last:border-0 hover:text-primary">
            <span>{o.reference} · {d(o.created_at)}</span>
            <span>{statusLabel[o.status] ?? o.status} · payment {o.payment_status} · <b>{naira(o.total)}</b></span>
          </Link>
        ))}
        {!orders.length && <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
