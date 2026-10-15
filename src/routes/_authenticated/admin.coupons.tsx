import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";
import { friendlyError } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Zaytun Admin" }, { name: "description", content: "Manage discount codes." }, { property: "og:title", content: "Coupons — Zaytun Admin" }, { property: "og:description", content: "Manage coupons." }] }),
  component: Coupons,
});

function Coupons() {
  const qc = useQueryClient();
  const [c, setC] = useState({ code: "", percent_off: "10", min_order: "0" });
  const { data = [] } = useQuery({ queryKey: ["coupons"], queryFn: async () => (await supabase.from("coupons").select("*")).data ?? [] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(c.percent_off);
    if (pct < 1 || pct > 90) return toast.error("Discount must be between 1% and 90%");
    const { error } = await supabase.from("coupons").insert({ code: c.code.toUpperCase().trim(), percent_off: pct, min_order: Number(c.min_order) });
    if (error) return toast.error(friendlyError(error));
    setC({ code: "", percent_off: "10", min_order: "0" });
    qc.invalidateQueries({ queryKey: ["coupons"] });
  };
  const toggle = async (code: string, active: boolean) => {
    const { error } = await supabase.from("coupons").update({ active }).eq("code", code);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries({ queryKey: ["coupons"] });
  };
  const del = async (code: string) => {
    if (!confirm(`Delete ${code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("code", code);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries({ queryKey: ["coupons"] });
  };
  const inp = "rounded-lg border bg-background px-3 py-2 text-sm";
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Coupons</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <input required className={inp} placeholder="CODE" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
        <input className={`${inp} w-24`} type="number" placeholder="% off" value={c.percent_off} onChange={(e) => setC({ ...c, percent_off: e.target.value })} />
        <input className={`${inp} w-36`} type="number" placeholder="Min order ₦" value={c.min_order} onChange={(e) => setC({ ...c, min_order: e.target.value })} />
        <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Add coupon</button>
      </form>
      {data.map((x) => (
        <div key={x.code} className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm">
          <span><b>{x.code}</b> · {x.percent_off}% off · min {naira(x.min_order)}</span>
          <span>
            <button onClick={() => toggle(x.code, !x.active)} className={`mr-3 ${x.active ? "text-success" : "text-muted-foreground"}`}>{x.active ? "Active" : "Disabled"}</button>
            <button onClick={() => del(x.code)} className="text-destructive">Delete</button>
          </span>
        </div>
      ))}
    </div>
  );
}
