import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dt, CLOSED_STATUSES } from "@/lib/format";
import { friendlyError, inputCls } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Zaytun Admin" }, { name: "description", content: "Stock levels and history." }, { property: "og:title", content: "Inventory — Zaytun Admin" }, { property: "og:description", content: "Stock levels." }] }),
  component: Inventory,
});

function Inventory() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id: string; qty: string; reason: string } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => {
      const [p, items, tx] = await Promise.all([
        supabase.from("products").select("id,name,sku,stock,low_stock_threshold").order("name"),
        supabase.from("order_items").select("product_id,quantity,orders(status)"),
        supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const sold: Record<string, number> = {};
      (items.data ?? []).forEach((i) => {
        const st = (i.orders as { status: string } | null)?.status;
        if (i.product_id && st && !CLOSED_STATUSES.includes(st)) sold[i.product_id] = (sold[i.product_id] ?? 0) + i.quantity;
      });
      return { products: p.data ?? [], sold, tx: tx.data ?? [] };
    },
  });

  const save = async () => {
    if (!edit) return;
    const n = parseInt(edit.qty);
    if (isNaN(n) || n < 0) return toast.error("Enter a stock of 0 or more");
    if (!edit.reason.trim()) return toast.error("Please give a reason");
    const { error } = await supabase.rpc("admin_adjust_stock", { _product: edit.id, _new_qty: n, _reason: edit.reason.trim() });
    if (error) return toast.error(friendlyError(error));
    toast.success("Stock updated");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  if (isLoading || !data) return <p className="text-muted-foreground">Loading inventory…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>{["Product", "SKU", "Stock", "Sold", "Alert at", "Status", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.products.map((p) => {
              const st = p.stock === 0 ? ["Out of stock", "text-destructive"] : p.stock <= p.low_stock_threshold ? ["Low stock", "text-gold"] : ["In stock", "text-success"];
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-xs">{p.sku}</td>
                  <td className="p-3 font-semibold">
                    {edit?.id === p.id ? (
                      <div className="flex flex-wrap gap-1">
                        <input type="number" min={0} className={`${inputCls} w-20`} value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} />
                        <input className={`${inputCls} w-44`} placeholder="Reason (e.g. new delivery)" value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} />
                        <button onClick={save} className="rounded bg-primary px-3 text-xs font-semibold text-primary-foreground">Save</button>
                        <button onClick={() => setEdit(null)} className="rounded border px-2 text-xs">×</button>
                      </div>
                    ) : p.stock}
                  </td>
                  <td className="p-3">{data.sold[p.id] ?? 0}</td>
                  <td className="p-3">{p.low_stock_threshold}</td>
                  <td className={`p-3 font-medium ${st[1]}`}>{st[0]}</td>
                  <td className="p-3 text-right">{edit?.id !== p.id && <button onClick={() => setEdit({ id: p.id, qty: String(p.stock), reason: "" })} className="text-primary">Adjust</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 font-semibold">Stock history</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Product", "Before", "After", "Change", "Reason", "By", "When"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
            <tbody>
              {data.tx.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.product_name}</td><td className="p-2">{t.old_qty}</td><td className="p-2">{t.new_qty}</td>
                  <td className={`p-2 font-semibold ${t.change < 0 ? "text-destructive" : "text-success"}`}>{t.change > 0 ? "+" : ""}{t.change}</td>
                  <td className="p-2">{t.reason}</td><td className="p-2 text-xs">{t.actor_email ?? "Customer order"}</td><td className="whitespace-nowrap p-2 text-xs">{dt(t.created_at)}</td>
                </tr>
              ))}
              {!data.tx.length && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No stock changes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
