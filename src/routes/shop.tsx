import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";

type Search = { q?: string; category?: string; sort?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop all products — Zaytun Digital Tech Store" },
      { name: "description", content: "Browse smartphones, laptops, tablets, audio, gaming and networking gear at Zaytun Digital Tech Store." },
      { property: "og:title", content: "Shop — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Browse genuine tech products with Naira pricing and nationwide delivery." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { q, category, sort } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", q, category, sort, cats.length],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,slug,brand,price,discount_price,images,stock,category_id").eq("active", true);
      if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,brand.ilike.%${q.replace(/[%,()]/g, "")}%`);
      if (category) {
        const c = cats.find((c) => c.slug === category);
        if (c) query = query.eq("category_id", c.id);
      }
      if (sort === "price-asc") query = query.order("price", { ascending: true });
      else if (sort === "price-desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !category || cats.length > 0,
  });
  const current = cats.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">{q ? `Results for “${q}”` : current?.name ?? "All products"}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link to="/shop" search={{ q, sort }} className={`rounded-full border px-3 py-1 text-sm ${!category ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} to="/shop" search={{ q, sort, category: c.slug }} className={`rounded-full border px-3 py-1 text-sm ${category === c.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {c.name}
          </Link>
        ))}
        <select
          value={sort ?? ""}
          onChange={(e) => navigate({ search: { q, category, sort: e.target.value || undefined } })}
          className="ml-auto rounded-lg border bg-card px-3 py-1.5 text-sm"
        >
          <option value="">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No products found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
