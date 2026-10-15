import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, STAFF_ROLES, friendlyError, inputCls } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({ meta: [{ title: "Admin users — Zaytun Admin" }, { name: "description", content: "Manage staff roles." }, { property: "og:title", content: "Admin users — Zaytun Admin" }, { property: "og:description", content: "Manage staff." }] }),
  component: Staff,
});

const DESC: Record<string, string> = {
  super_admin: "Everything, including managing Super Admins",
  admin: "Everything except Super Admin roles",
  manager: "Orders, customers, products, stock, coupons, reviews, analytics",
  product_manager: "Products, categories and stock",
  order_manager: "Orders and customers",
  support: "View customers and orders, moderate reviews",
};

function Staff() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("support");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_staff"); if (error) throw error; return data ?? []; },
  });
  const setR = async (em: string, r: Role, grant: boolean) => {
    const { error } = await supabase.rpc("admin_set_role", { _email: em, _role: r, _grant: grant });
    if (error) return toast.error(friendlyError(error));
    toast.success(grant ? "Role granted" : "Role removed");
    qc.invalidateQueries({ queryKey: ["admin", "staff"] });
  };
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Admin users</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setR(email, role, true).then(() => setEmail("")); }} className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <input className={`${inputCls} flex-1`} type="email" required placeholder="Email of an existing account" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className={`${inputCls} w-48`} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Grant role</button>
      </form>
      <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        {STAFF_ROLES.map((r) => <p key={r}><b className="text-foreground">{ROLE_LABEL[r]}:</b> {DESC[r]}</p>)}
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data.map((s) => (
        <div key={s.user_id} className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-semibold">{s.full_name || s.email}</div>
          <div className="text-xs text-muted-foreground">{s.email}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(s.roles ?? []).map((r) => (
              <span key={r} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {ROLE_LABEL[r] ?? r}
                <button onClick={() => s.email && confirm(`Remove ${ROLE_LABEL[r]} from ${s.email}?`) && setR(s.email, r as Role, false)} className="text-destructive" aria-label="Remove role">×</button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
