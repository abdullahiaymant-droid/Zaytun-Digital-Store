import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product details — Zaytun Digital Tech Store" },
      { name: "description", content: "Specifications, prices and reviews at Zaytun Digital Tech Store." },
      { property: "og:title", content: "Product — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Genuine tech with warranty and nationwide delivery." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useUser();
  const cart = useCart();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState<string | undefined>();
  const [img, setImg] = useState(0);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await supabase.from("products").select("*, categories(name,slug)").eq("slug", slug).maybeSingle()).data,
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", p?.id],
    enabled: !!p,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("product_id", p!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: wished } = useQuery({
    queryKey: ["wish", p?.id, user?.id],
    enabled: !!p && !!user,
    queryFn: async () => !!(await supabase.from("wishlist").select("product_id").eq("product_id", p!.id).maybeSingle()).data,
  });

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-16">Product not found. <Link to="/shop" className="text-primary">Back to shop</Link></div>;

  const price = Number(p.discount_price ?? p.price);
  const specs = (p.specs ?? {}) as Record<string, string>;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const selColor = color ?? p.colors[0];

  const add = (buy = false) => {
    cart.add({ product_id: p.id, slug: p.slug, name: p.name, image: p.images[0], price, quantity: qty, color: selColor, stock: p.stock });
    toast.success("Added to cart");
    if (buy) nav({ to: "/cart" });
  };

  const toggleWish = async () => {
    if (!user) return nav({ to: "/auth" });
    if (wished) await supabase.from("wishlist").delete().eq("product_id", p.id).eq("user_id", user.id);
    else await supabase.from("wishlist").insert({ product_id: p.id, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["wish"] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/shop">Shop</Link> / {p.categories && <Link to="/shop" search={{ category: p.categories.slug }}>{p.categories.name}</Link>}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-card">
            <img src={p.images[img] ?? p.images[0]} alt={p.name} className="h-full w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((src, i) => (
                <button key={src + i} onClick={() => setImg(i)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === img ? "border-primary" : "border-transparent"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.brand} · SKU {p.sku}</span>
          <h1 className="mt-1 text-3xl font-bold">{p.name}</h1>
          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-gold text-gold" /> {avg.toFixed(1)} ({reviews.length} reviews)
            </div>
          )}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-primary">{naira(price)}</span>
            {p.discount_price && <span className="text-muted-foreground line-through">{naira(p.price)}</span>}
          </div>
          <p className={`mt-2 text-sm font-medium ${p.stock > 0 ? "text-success" : "text-destructive"}`}>
            {p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Out of stock"}
          </p>
          <p className="mt-4 text-muted-foreground">{p.description}</p>

          {p.colors.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold">Colour: {selColor}</div>
              <div className="flex flex-wrap gap-2">
                {p.colors.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`rounded-lg border px-3 py-1.5 text-sm ${selColor === c ? "border-primary bg-secondary" : "bg-card"}`}>{c}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-lg border bg-card">
              <button className="p-2.5" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center">{qty}</span>
              <button className="p-2.5" onClick={() => setQty(Math.min(p.stock, qty + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={toggleWish} className="rounded-lg border bg-card p-2.5" aria-label="Wishlist">
              <Heart className={`h-5 w-5 ${wished ? "fill-destructive text-destructive" : ""}`} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button disabled={p.stock === 0} onClick={() => add()} className="rounded-lg border-2 border-primary py-3 font-semibold text-primary disabled:opacity-50">Add to cart</button>
            <button disabled={p.stock === 0} onClick={() => add(true)} className="rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">Buy now</button>
          </div>

          {Object.keys(specs).length > 0 && (
            <div className="mt-8 overflow-hidden rounded-xl border bg-card">
              <h3 className="border-b px-4 py-3 font-semibold">Specifications</h3>
              <dl className="divide-y text-sm">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 px-4 py-2.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
      <Reviews productId={p.id} reviews={reviews} />
    </div>
  );
}

function Reviews({ productId, reviews }: { productId: string; reviews: { id: string; author_name: string; rating: number; comment: string; created_at: string }[] }) {
  const { user } = useUser();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.slice(0, 1000),
      author_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Customer",
    });
    if (error) return toast.error(error.code === "23505" ? "You've already reviewed this product" : error.message);
    setComment("");
    toast.success("Thanks for your review");
    qc.invalidateQueries({ queryKey: ["reviews", productId] });
  };

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold">Customer reviews</h2>
      {user ? (
        <form onSubmit={submit} className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience" className="mt-3 w-full rounded-lg border bg-background p-3 text-sm" rows={3} />
          <button className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Submit review</button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground"><Link to="/auth" className="font-semibold text-primary">Sign in</Link> to write a review.</p>
      )}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{r.author_name}</span>
              <span className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
