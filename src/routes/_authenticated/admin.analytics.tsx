import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { naira, CLOSED_STATUSES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Zaytun Admin" }, { name: "description", content: "Sales analytics." }, { property: "og:title", content: "Analytics — Zaytun Admin" }, { property: "og:description", content: "Sales analytics." }] }),
  component: Analytics,
});

const COLORS = ["var(--primary)", "var(--gold)", "var(--muted-foreground)", "var(--destructive)", "var(--success)"];

function Analytics() {
  const [days, setDays] = useState(30);
  const [group, setGroup] = useState<"day" | "week" | "month">("day");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const [o, i, c, p, cat] = await Promise.all([
        supabase.from("orders").select("id,total,status,payment_method,created_at"),
        supabase.from("order_items").select("order_id,product_id,name,quantity,price"),
        supabase.from("profiles").select("created_at"),
        supabase.from("products").select("id,category_id"),
        supabase.from("categories").select("id,name"),
      ]);
      return { orders: o.data ?? [], items: i.data ?? [], customers: c.data ?? [], products: p.data ?? [], cats: cat.data ?? [] };
    },
  });
  if (isLoading || !data) return <p className="text-muted-foreground">Loading analytics…</p>;

  const since = Date.now() - days * 864e5;
  const orders = data.orders.filter((o) => new Date(o.created_at).getTime() >= since && !CLOSED_STATUSES.includes(o.status));
  const ids = new Set(orders.map((o) => o.id));
  const items = data.items.filter((i) => ids.has(i.order_id));
  const key = (s: string) => {
    const x = new Date(s);
    if (group === "month") return x.toISOString().slice(0, 7);
    if (group === "week") { const m = new Date(x); m.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return m.toISOString().slice(0, 10); }
    return x.toISOString().slice(0, 10);
  };
  const series: Record<string, { k: string; revenue: number; orders: number; customers: number }> = {};
  const bump = (k: string) => (series[k] ??= { k, revenue: 0, orders: 0, customers: 0 });
  orders.forEach((o) => { const r = bump(key(o.created_at)); r.revenue += Number(o.total); r.orders++; });
  data.customers.filter((c) => new Date(c.created_at).getTime() >= since).forEach((c) => bump(key(c.created_at)).customers++);
  const timeline = Object.values(series).sort((a, b) => a.k.localeCompare(b.k));

  const top: Record<string, { name: string; qty: number }> = {};
  items.forEach((i) => { (top[i.name] ??= { name: i.name, qty: 0 }).qty += i.quantity; });
  const topList = Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 8);

  const catOf = (pid: string | null) => data.cats.find((c) => c.id === data.products.find((p) => p.id === pid)?.category_id)?.name ?? "Other";
  const byCat: Record<string, number> = {};
  items.forEach((i) => { const n = catOf(i.product_id); byCat[n] = (byCat[n] ?? 0) + Number(i.price) * i.quantity; });
  const catList = Object.entries(byCat).map(([name, value]) => ({ name, value }));
  const byPay: Record<string, number> = {};
  orders.forEach((o) => { const n = o.payment_method === "cod" ? "Pay on delivery" : "Bank transfer"; byPay[n] = (byPay[n] ?? 0) + 1; });
  const payList = Object.entries(byPay).map(([name, value]) => ({ name, value }));

  const card = "rounded-xl border bg-card p-4";
  const empty = <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period yet.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option>
          </select>
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
            <option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}><h3 className="mb-2 font-semibold">Revenue · {naira(orders.reduce((s, o) => s + Number(o.total), 0))}</h3>
          {timeline.length ? <ResponsiveContainer height={240}><BarChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="k" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => naira(v)} /><Bar dataKey="revenue" fill="var(--primary)" /></BarChart></ResponsiveContainer> : empty}</div>
        <div className={card}><h3 className="mb-2 font-semibold">Orders & new customers</h3>
          {timeline.length ? <ResponsiveContainer height={240}><LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="k" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Line dataKey="orders" stroke="var(--primary)" /><Line dataKey="customers" stroke="var(--gold)" /></LineChart></ResponsiveContainer> : empty}</div>
        <div className={card}><h3 className="mb-2 font-semibold">Top-selling products</h3>
          {topList.length ? <ResponsiveContainer height={260}><BarChart data={topList} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={140} fontSize={10} /><Tooltip /><Bar dataKey="qty" fill="var(--gold)" /></BarChart></ResponsiveContainer> : empty}</div>
        <div className={`${card} grid grid-cols-2`}>
          <div><h3 className="mb-2 font-semibold">Sales by category</h3>{catList.length ? <ResponsiveContainer height={220}><PieChart><Pie data={catList} dataKey="value" nameKey="name" outerRadius={80}>{catList.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => naira(v)} /></PieChart></ResponsiveContainer> : empty}</div>
          <div><h3 className="mb-2 font-semibold">Payment methods</h3>{payList.length ? <ResponsiveContainer height={220}><PieChart><Pie data={payList} dataKey="value" nameKey="name" outerRadius={80}>{payList.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : empty}</div>
        </div>
      </div>
    </div>
  );
}
