import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira, statusLabel } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";

type Tab = "orders" | "wishlist" | "profile";

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "wishlist" || s.tab === "profile" ? s.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My account — Zaytun Digital Tech Store" },
      { name: "description", content: "Your orders, wishlist and profile." },
      { property: "og:title", content: "My account — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Manage your account." },
    ],
  }),
  component: Account,
});

function Account() {
  const { tab = "orders" } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const nav = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My account</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button onClick={signOut} className="rounded-lg border px-4 py-2 text-sm font-medium">Sign out</button>
      </div>
      <div className="mt-6 flex gap-2 border-b">
        {(["orders", "wishlist", "profile"] as Tab[]).map((t) => (
          <Link key={t} to="/account" search={{ tab: t }} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        {tab === "orders" && <Orders userId={user.id} />}
        {tab === "wishlist" && <Wishlist userId={user.id} />}
        {tab === "profile" && <Profile userId={user.id} />}
      </div>
    </div>
  );
}

function Orders({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: async () => (await supabase.from("orders").select("id,reference,status,total,created_at").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="text-muted-foreground">No orders yet. <Link to="/shop" className="text-primary">Start shopping</Link></p>;
  return (
    <div className="space-y-2">
      {data.map((o) => (
        <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-primary">
          <div>
            <div className="font-semibold">{o.reference}</div>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-NG")}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{naira(o.total)}</div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{statusLabel[o.status] ?? o.status}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Wishlist({ userId }: { userId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => (await supabase.from("wishlist").select("products(id,name,slug,brand,price,discount_price,images,stock)").eq("user_id", userId)).data ?? [],
  });
  const items = data.map((w) => w.products).filter(Boolean);
  if (!items.length) return <p className="text-muted-foreground">Your wishlist is empty.</p>;
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map((p) => <ProductCard key={p!.id} p={p!} />)}</div>;
}

function Profile({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { data } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });
  useEffect(() => {
    if (data) { setName(data.full_name ?? ""); setPhone(data.phone ?? ""); }
  }, [data]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: name.slice(0, 100), phone: phone.slice(0, 20) }).eq("id", userId);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };
  return (
    <form onSubmit={save} className="max-w-md space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border bg-card px-3 py-2.5" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border bg-card px-3 py-2.5" />
      <button className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Save</button>
    </form>
  );
}
