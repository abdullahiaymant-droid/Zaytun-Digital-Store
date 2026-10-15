import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";
import { friendlyError, inputCls as inp } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "Products — Zaytun Admin" }, { name: "description", content: "Manage products." }, { property: "og:title", content: "Products — Zaytun Admin" }, { property: "og:description", content: "Manage products." }] }),
  component: Products,
});

type Draft = {
  id?: string; name: string; slug: string; description: string; category_id: string | null; brand: string; sku: string;
  price: string; discount_price: string; stock: string; low: string; images: string; colors: string; specs: string; featured: boolean; active: boolean;
};
const empty: Draft = { name: "", slug: "", description: "", category_id: null, brand: "", sku: "", price: "", discount_price: "", stock: "0", low: "5", images: "", colors: "", specs: "", featured: false, active: true };

function Products() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "";

  const edit = (p: (typeof products)[number]) =>
    setDraft({
      id: p.id, name: p.name, slug: p.slug, description: p.description, category_id: p.category_id, brand: p.brand, sku: p.sku,
      price: String(p.price), discount_price: p.discount_price ? String(p.discount_price) : "", stock: String(p.stock), low: String(p.low_stock_threshold),
      images: p.images.join("\n"), colors: p.colors.join(", "),
      specs: Object.entries((p.specs ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n"),
      featured: p.featured, active: p.active,
    });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.price) return toast.error("Name and price are required");
    if (Number(draft.price) < 0 || parseInt(draft.stock) < 0) return toast.error("Price and stock can't be negative");
    const specs: Record<string, string> = {};
    draft.specs.split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) specs[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    const row = {
      name: draft.name.trim(),
      slug: (draft.slug || draft.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: draft.description, category_id: draft.category_id, brand: draft.brand, sku: draft.sku,
      price: Number(draft.price), discount_price: draft.discount_price ? Number(draft.discount_price) : null,
      stock: Math.max(0, parseInt(draft.stock) || 0), low_stock_threshold: Math.max(0, parseInt(draft.low) || 0),
      images: draft.images.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      colors: draft.colors.split(",").map((s) => s.trim()).filter(Boolean),
      specs, featured: draft.featured, active: draft.active,
    };
    const { error } = draft.id ? await supabase.from("products").update(row).eq("id", draft.id) : await supabase.from("products").insert(row);
    if (error) return toast.error(friendlyError(error));
    toast.success("Product saved");
    setDraft(null);
    qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries();
  };
  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("products").update({ active }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries();
  };

  const s = q.toLowerCase();
  const rows = products.filter((p) => !s || [p.name, p.sku, p.brand, catName(p.category_id)].some((v) => v.toLowerCase().includes(s)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <input className={`${inp} w-56`} placeholder="Search name, SKU, brand, category" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => setDraft({ ...empty })} className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">+ Add product</button>
        </div>
      </div>
      {draft && (
        <div className="grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-2">
          <input className={inp} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inp} placeholder="Web address name (auto from name)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          <input className={inp} placeholder="Brand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
          <input className={inp} placeholder="SKU" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
          <select className={inp} value={draft.category_id ?? ""} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
            <option value="">No category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className={inp} type="number" min={0} placeholder="Stock" value={draft.stock} disabled={!!draft.id} title={draft.id ? "Change stock from Inventory" : ""} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
            <input className={inp} type="number" min={0} placeholder="Low stock alert at" value={draft.low} onChange={(e) => setDraft({ ...draft, low: e.target.value })} />
          </div>
          <input className={inp} type="number" placeholder="Price (₦)" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <input className={inp} type="number" placeholder="Discount price (₦, optional)" value={draft.discount_price} onChange={(e) => setDraft({ ...draft, discount_price: e.target.value })} />
          <textarea className={`${inp} md:col-span-2`} rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <textarea className={inp} rows={3} placeholder="Image links, one per line" value={draft.images} onChange={(e) => setDraft({ ...draft, images: e.target.value })} />
          <textarea className={inp} rows={3} placeholder={"Specifications, one per line\nRAM: 8GB"} value={draft.specs} onChange={(e) => setDraft({ ...draft, specs: e.target.value })} />
          <input className={inp} placeholder="Colours, comma separated" value={draft.colors} onChange={(e) => setDraft({ ...draft, colors: e.target.value })} />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Published</label>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
            <button onClick={() => setDraft(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {isLoading && <p className="text-muted-foreground">Loading products…</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3"><div className="flex items-center gap-2"><img src={p.images[0]} alt="" className="h-9 w-9 rounded object-cover" /><div>{p.name}<div className="text-xs text-muted-foreground">{p.brand}</div></div></div></td>
                <td className="p-3 text-xs">{p.sku}</td>
                <td className="p-3">{catName(p.category_id)}</td>
                <td className="whitespace-nowrap p-3">{naira(p.discount_price ?? p.price)}</td>
                <td className={`p-3 ${p.stock <= p.low_stock_threshold ? "font-semibold text-destructive" : ""}`}>{p.stock}</td>
                <td className="p-3"><button onClick={() => toggle(p.id, !p.active)} className={p.active ? "text-success" : "text-muted-foreground"}>{p.active ? "Published" : "Hidden"}</button></td>
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
