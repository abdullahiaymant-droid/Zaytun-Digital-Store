import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Zaytun Admin" }, { name: "description", content: "Store alerts." }, { property: "og:title", content: "Notifications — Zaytun Admin" }, { property: "og:description", content: "Store alerts." }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); qc.invalidateQueries({ queryKey: ["notif-unread"] }); };
  const markAll = async () => { await supabase.from("notifications").update({ read: true }).eq("read", false); refresh(); };
  const mark = async (id: string) => { await supabase.from("notifications").update({ read: true }).eq("id", id); refresh(); };
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAll} className="rounded-lg border px-3 py-1.5 text-sm">Mark all read</button>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && !data.length && <p className="text-muted-foreground">No notifications yet.</p>}
      {data.map((n) => (
        <div key={n.id} className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${n.read ? "bg-card" : "border-primary/40 bg-accent"}`}>
          <div>
            <div className="font-semibold">{n.title}</div>
            <p>{n.body}</p>
            <p className="text-xs text-muted-foreground">{dt(n.created_at)}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            {n.link && <Link to={n.link} onClick={() => mark(n.id)} className="text-primary">Open</Link>}
            {!n.read && <button onClick={() => mark(n.id)} className="text-muted-foreground">Mark read</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
