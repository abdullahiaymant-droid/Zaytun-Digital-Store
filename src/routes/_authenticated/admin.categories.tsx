import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, inputCls } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Zaytun Admin" }, { name: "description", content: "Manage categories." }, { property: "og:title", content: "Categories — Zaytun Admin" }, { property: "og:description", content: "Manage categories." }] }),
  component: Categories,
});

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim(), slug: slug(name), sort: data.length + 1 });
    if (error) return toast.error(friendlyError(error));
    setName("");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const rename = async (id: string, old: string) => {
    const n = prompt("New name", old);
    if (!n?.trim()) return;
    const { error } = await supabase.from("categories").update({ name: n.trim(), slug: slug(n) }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete this category? Its products will become uncategorised.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <form onSubmit={add} className="flex gap-2 rounded-xl border bg-card p-4">
        <input className={inputCls} placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
      </form>
      {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm">
          <span className="font-medium">{c.name}</span>
          <span><button onClick={() => rename(c.id, c.name)} className="mr-3 text-primary">Rename</button><button onClick={() => del(c.id)} className="text-destructive">Delete</button></span>
        </div>
      ))}
    </div>
  );
}
