import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit logs — Zaytun Admin" }, { name: "description", content: "Record of admin actions." }, { property: "og:title", content: "Audit logs — Zaytun Admin" }, { property: "og:description", content: "Admin actions." }] }),
  component: Audit,
});

function Audit() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit logs</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>{["When", "Admin", "Action", "Target", "Details"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="whitespace-nowrap p-3 text-xs">{dt(a.created_at)}</td>
                <td className="p-3">{a.actor_email}</td>
                <td className="p-3 capitalize">{a.action}</td>
                <td className="p-3">{a.target}</td>
                <td className="p-3 text-xs text-muted-foreground">{Object.entries((a.meta ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
              </tr>
            ))}
            {!isLoading && !data.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No actions recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
