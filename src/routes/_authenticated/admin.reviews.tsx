import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { d } from "@/lib/format";
import { friendlyError } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Zaytun Admin" }, { name: "description", content: "Moderate product reviews." }, { property: "og:title", content: "Reviews — Zaytun Admin" }, { property: "og:description", content: "Moderate reviews." }] }),
  component: Reviews,
});

function Reviews() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const del = async (id: string) => {
    if (!confirm("Remove this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Review removed");
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  };
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Reviews</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && !data.length && <p className="text-muted-foreground">No reviews yet.</p>}
      {data.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4 text-sm">
          <div>
            <div className="font-semibold">{(r.products as { name: string } | null)?.name} · <span className="text-gold">{"★".repeat(r.rating)}</span></div>
            <p className="mt-1">{r.comment}</p>
            <p className="text-xs text-muted-foreground">{r.author_name} · {d(r.created_at)}</p>
          </div>
          <button onClick={() => del(r.id)} className="text-destructive">Remove</button>
        </div>
      ))}
    </div>
  );
}
