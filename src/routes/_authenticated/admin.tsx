import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira, ORDER_STATUSES, PAYMENT_STATUSES, statusLabel } from "@/lib/format";

type Tab = "dashboard" | "products" | "orders" | "coupons";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["products", "orders", "coupons"].includes(s.tab as string) ? (s.tab as Tab) : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Zaytun Digital Tech Store" },
      { name: "description", content: "Store management dashboard." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Store management." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { tab = "dashboard" } = Route.useSearch();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Store admin</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto border-b">
        {(["dashboard", "products", "orders", "coupons"] as Tab[]).map((t) => (
          <Link key={t} to="/admin" search={{ tab: t === "dashboard" ? undefined : t }} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "products" && <Products />}
        {tab === "orders" && <Orders />}
        {tab === "coupons" && <Coupons />}
      </div>
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from("orders").select("id,reference,total,status,payment_status,created_at,shipping_name").order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,stock"),
      ]);
      return { orders: orders ?? [], products: products ?? [] };
    },
  });
  const orders = data?.orders ?? [];
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const low = (data?.products ?? []).filter((p) => p.stock <= 5);
  const stats = [
    ["Revenue", naira(revenue)],
    ["Orders", orders.length],
    ["Pending", orders.filter((o) => o.status === "pending").length],
    ["Products", data?.products.length ?? 0],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k as string} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 font-display text-2xl font-bold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold">Recent orders</h3>
          {orders.slice(0, 6).map((o) => (
            <div key={o.id} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span>{o.reference} · {o.shipping_name}</span><span>{naira(o.total)}</span>
            </div>
          ))}
          {!orders.length && <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold">Low stock (≤5)</h3>
          {low.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{p.name}</span><span className="font-semibold text-destructive">{p.stock}</span></div>
          ))}
          {!low.length && <p className="mt-2 text-sm text-muted-foreground">All products well stocked.</p>}
        </div>
      </div>
    </div>
  );
}

type Draft = {
  id?: string; name: string; slug: string; description: string; category_id: string | null; brand: string; sku: string;
  price: string; discount_price: string; stock: string; images: string; colors: string; specs: string; featured: boolean; active: boolean;
};
const empty: Draft = { name: "", slug: "", description: "", category_id: null, brand: "", sku: "", price: "", discount_price: "", stock: "0", images: "", colors: "", specs: "", featured: false, active: true };

function Products() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const edit = (p: (typeof products)[number]) =>
    setDraft({
      id: p.id, name: p.name, slug: p.slug, description: p.description, category_id: p.category_id, brand: p.brand, sku: p.sku,
      price: String(p.price), discount_price: p.discount_price ? String(p.discount_price) : "", stock: String(p.stock),
      images: p.images.join("\n"), colors: p.colors.join(", "),
      specs: Object.entries((p.specs ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n"),
      featured: p.featured, active: p.active,
    });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.price) return toast.error("Name and price are required");
    const specs: Record<string, string> = {};
    draft.specs.split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) specs[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    const row = {
      name: draft.name.trim(),
      slug: (draft.slug || draft.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: draft.description, category_id: draft.category_id, brand: draft.brand, sku: draft.sku,
      price: Number(draft.price), discount_price: draft.discount_price ? Number(draft.discount_price) : null,
      stock: Math.max(0, parseInt(draft.stock) || 0),
      images: draft.images.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      colors: draft.colors.split(",").map((s) => s.trim()).filter(Boolean),
      specs, featured: draft.featured, active: draft.active,
    };
    const { error } = draft.id ? await supabase.from("products").update(row).eq("id", draft.id) : await supabase.from("products").insert(row);
    if (error) return toast.error(error.message);
    toast.success("Product saved");
    setDraft(null);
    qc.invalidateQueries();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  };

  const inp = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
  return (
    <div>
      <button onClick={() => setDraft({ ...empty })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">+ Add product</button>
      {draft && (
        <div className="mt-4 grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-2">
          <input className={inp} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inp} placeholder="Web address name (auto from name)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          <input className={inp} placeholder="Brand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
          <input className={inp} placeholder="SKU" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
          <select className={inp} value={draft.category_id ?? ""} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
            <option value="">No category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className={inp} type="number" placeholder="Stock" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
          <input className={inp} type="number" placeholder="Price (₦)" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <input className={inp} type="number" placeholder="Discount price (₦, optional)" value={draft.discount_price} onChange={(e) => setDraft({ ...draft, discount_price: e.target.value })} />
          <textarea className={`${inp} md:col-span-2`} rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <textarea className={inp} rows={3} placeholder="Image links, one per line" value={draft.images} onChange={(e) => setDraft({ ...draft, images: e.target.value })} />
          <textarea className={inp} rows={3} placeholder={"Specifications, one per line\nRAM: 8GB"} value={draft.specs} onChange={(e) => setDraft({ ...draft, specs: e.target.value })} />
          <input className={inp} placeholder="Colours, comma separated" value={draft.colors} onChange={(e) => setDraft({ ...draft, colors: e.target.value })} />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Visible in store</label>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
            <button onClick={() => setDraft(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Product</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="flex items-center gap-2 p-3"><img src={p.images[0]} alt="" className="h-9 w-9 rounded object-cover" />{p.name}</td>
                <td className="p-3">{naira(p.discount_price ?? p.price)}</td>
                <td className={`p-3 ${p.stock <= 5 ? "font-semibold text-destructive" : ""}`}>{p.stock}</td>
                <td className="p-3">{p.active ? "Live" : "Hidden"}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <button onClick={() => edit(p)} className="mr-3 text-primary">Edit</button>
                  <button onClick={() => del(p.id)} className="text-destructive">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(name,quantity)").order("created_at", { ascending: false })).data ?? [],
  });
  const update = async (id: string, patch: { status?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  if (!data.length) return <p className="text-muted-foreground">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {data.map((o) => (
        <div key={o.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link to="/order/$id" params={{ id: o.id }} className="font-semibold text-primary">{o.reference}</Link>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-NG")} · {o.payment_method === "cod" ? "Pay on delivery" : "Bank transfer"}</div>
              <div className="mt-1 text-sm">{o.shipping_name} · {o.phone} · {o.city}, {o.state}</div>
              <div className="text-xs text-muted-foreground">{o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold">{naira(o.total)}</div>
              <div className="mt-2 flex gap-2">
                <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="rounded-lg border bg-background px-2 py-1 text-xs">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
                <select value={o.payment_status} onChange={(e) => update(o.id, { payment_status: e.target.value })} className="rounded-lg border bg-background px-2 py-1 text-xs capitalize">
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>Payment {s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const [c, setC] = useState({ code: "", percent_off: "10", min_order: "0" });
  const { data = [] } = useQuery({ queryKey: ["coupons"], queryFn: async () => (await supabase.from("coupons").select("*")).data ?? [] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("coupons").insert({ code: c.code.toUpperCase().trim(), percent_off: Number(c.percent_off), min_order: Number(c.min_order) });
    if (error) return toast.error(error.message);
    setC({ code: "", percent_off: "10", min_order: "0" });
    qc.invalidateQueries({ queryKey: ["coupons"] });
  };
  const toggle = async (code: string, active: boolean) => {
    await supabase.from("coupons").update({ active }).eq("code", code);
    qc.invalidateQueries({ queryKey: ["coupons"] });
  };
  const inp = "rounded-lg border bg-background px-3 py-2 text-sm";
  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <input required className={inp} placeholder="CODE" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
        <input className={`${inp} w-24`} type="number" placeholder="% off" value={c.percent_off} onChange={(e) => setC({ ...c, percent_off: e.target.value })} />
        <input className={`${inp} w-36`} type="number" placeholder="Min order ₦" value={c.min_order} onChange={(e) => setC({ ...c, min_order: e.target.value })} />
        <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Add coupon</button>
      </form>
      {data.map((x) => (
        <div key={x.code} className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm">
          <span><b>{x.code}</b> · {x.percent_off}% off · min {naira(x.min_order)}</span>
          <button onClick={() => toggle(x.code, !x.active)} className={x.active ? "text-success" : "text-muted-foreground"}>{x.active ? "Active" : "Disabled"}</button>
        </div>
      ))}
    </div>
  );
}
