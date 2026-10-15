import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { naira, d, statusLabel, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/format";
import { inputCls } from "@/lib/admin";

type S = { q?: string; status?: string; pay?: string; from?: string; to?: string; sort?: "new" | "old" | "high" | "low"; page?: number };

export const Route = createFileRoute("/_authenticated/admin/orders")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    pay: typeof s.pay === "string" ? s.pay : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    sort: ["new", "old", "high", "low"].includes(s.sort as string) ? (s.sort as S["sort"]) : undefined,
    page: Number(s.page) > 1 ? Number(s.page) : undefined,
  }),
  head: () => ({ meta: [{ title: "Orders — Zaytun Admin" }, { name: "description", content: "All store orders." }, { property: "og:title", content: "Orders — Zaytun Admin" }, { property: "og:description", content: "All store orders." }] }),
  component: OrdersPage,
});

const PER = 20;

function OrdersPage() {
  const child = useMatch({ from: "/_authenticated/admin/orders/$id", shouldThrow: false });
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const set = (p: Partial<S>) => navigate({ search: (prev) => ({ ...prev, ...p, page: undefined }) });
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const r = await supabase.from("orders").select("*, order_items(name,quantity)").order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const { data: emails = {} } = useQuery({
    queryKey: ["admin", "emails"],
    queryFn: async () => Object.fromEntries(((await supabase.from("profiles").select("id,email")).data ?? []).map((p) => [p.id, p.email ?? ""])),
  });
  if (child) return <Outlet />;

  const q = (s.q ?? "").toLowerCase();
  let rows = data.filter((o) =>
    (!q || [o.reference, o.shipping_name, o.phone, emails[o.user_id], o.id].some((v) => v?.toLowerCase().includes(q))) &&
    (!s.status || o.status === s.status) && (!s.pay || o.payment_status === s.pay) &&
    (!s.from || o.created_at >= s.from) && (!s.to || o.created_at.slice(0, 10) <= s.to));
  rows = [...rows].sort((a, b) =>
    s.sort === "old" ? a.created_at.localeCompare(b.created_at) : s.sort === "high" ? b.total - a.total : s.sort === "low" ? a.total - b.total : b.created_at.localeCompare(a.created_at));
  const page = s.page ?? 1;
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const shown = rows.slice((page - 1) * PER, page * PER);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders <span className="text-base font-normal text-muted-foreground">({rows.length})</span></h1>
      <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-6">
        <input className={`${inputCls} lg:col-span-2`} placeholder="Order ref, customer, email, phone" defaultValue={s.q} onChange={(e) => set({ q: e.target.value || undefined })} />
        <select className={inputCls} value={s.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
          <option value="">All statuses</option>{ORDER_STATUSES.map((x) => <option key={x} value={x}>{statusLabel[x]}</option>)}
        </select>
        <select className={inputCls} value={s.pay ?? ""} onChange={(e) => set({ pay: e.target.value || undefined })}>
          <option value="">All payments</option>{PAYMENT_STATUSES.map((x) => <option key={x} value={x} className="capitalize">{x}</option>)}
        </select>
        <div className="flex gap-1"><input type="date" className={inputCls} value={s.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} /><input type="date" className={inputCls} value={s.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} /></div>
        <select className={inputCls} value={s.sort ?? "new"} onChange={(e) => set({ sort: e.target.value as S["sort"] })}>
          <option value="new">Newest</option><option value="old">Oldest</option><option value="high">Highest total</option><option value="low">Lowest total</option>
        </select>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading orders…</p>}
      {error && <p className="text-destructive">Could not load orders.</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>{["Order", "Customer", "Date", "Items", "Total", "Payment", "Status", "Method"].map((h) => <th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/40">
                <td className="p-3"><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-semibold text-primary">{o.reference}</Link></td>
                <td className="p-3"><Link to="/admin/customers/$id" params={{ id: o.user_id }} className="hover:text-primary">{o.shipping_name}</Link><div className="text-xs text-muted-foreground">{emails[o.user_id]}</div></td>
                <td className="whitespace-nowrap p-3">{d(o.created_at)}</td>
                <td className="max-w-[220px] truncate p-3 text-xs">{o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                <td className="whitespace-nowrap p-3 font-semibold">{naira(o.total)}</td>
                <td className="p-3 capitalize">{o.payment_status}</td>
                <td className="whitespace-nowrap p-3">{statusLabel[o.status] ?? o.status}</td>
                <td className="whitespace-nowrap p-3 text-xs">{o.payment_method === "cod" ? "Pay on delivery" : "Bank transfer"}</td>
              </tr>
            ))}
            {!isLoading && !shown.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
