import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { naira, d } from "@/lib/format";
import { ROLE_LABEL, inputCls } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "Customers — Zaytun Admin" }, { name: "description", content: "All registered customers." }, { property: "og:title", content: "Customers — Zaytun Admin" }, { property: "og:description", content: "All registered customers." }] }),
  component: CustomersPage,
});

export const customersQuery = {
  queryKey: ["admin", "customers"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_customers");
    if (error) throw error;
    return data ?? [];
  },
};

function CustomersPage() {
  const child = useMatch({ from: "/_authenticated/admin/customers/$id", shouldThrow: false });
  const [q, setQ] = useState("");
  const { data = [], isLoading, error } = useQuery(customersQuery);
  if (child) return <Outlet />;
  const s = q.toLowerCase();
  const rows = data.filter((c) => !s || [c.full_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(s)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Customers <span className="text-base font-normal text-muted-foreground">({data.length})</span></h1>
        <input className={`${inputCls} max-w-xs`} placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading && <p className="text-muted-foreground">Loading customers…</p>}
      {error && <p className="text-destructive">Could not load customers.</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>{["Customer", "Email", "Phone", "Joined", "Orders", "Spent", "Last order", "Status", "Type", ""].map((h) => <th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const staff = (c.roles ?? []).filter((r) => r !== "customer");
              return (
                <tr key={c.id} className="border-t hover:bg-muted/40">
                  <td className="p-3 font-medium">{c.full_name || "—"}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.phone || "—"}</td>
                  <td className="whitespace-nowrap p-3">{d(c.created_at)}</td>
                  <td className="p-3">{c.order_count}</td>
                  <td className="whitespace-nowrap p-3">{naira(c.total_spent)}</td>
                  <td className="whitespace-nowrap p-3">{d(c.last_order)}</td>
                  <td className="p-3">{c.disabled ? <span className="text-destructive">Disabled</span> : <span className="text-success">Active</span>}</td>
                  <td className="whitespace-nowrap p-3">{staff.length ? ROLE_LABEL[staff[0]] : Number(c.order_count) > 1 ? "Returning" : Number(c.order_count) === 1 ? "New buyer" : "Registered"}</td>
                  <td className="p-3"><Link to="/admin/customers/$id" params={{ id: c.id }} className="font-semibold text-primary">View</Link></td>
                </tr>
              );
            })}
            {!isLoading && !rows.length && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
