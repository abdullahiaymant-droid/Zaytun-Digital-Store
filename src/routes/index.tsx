import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Truck, Wallet, Headphones } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zaytun Digital Tech Store — Phones, Laptops & Gadgets in Nigeria" },
      { name: "description", content: "Shop genuine smartphones, laptops, tablets, audio and accessories with warranty and fast delivery across Nigeria." },
      { property: "og:title", content: "Zaytun Digital Tech Store" },
      { property: "og:description", content: "Genuine phones, laptops and gadgets delivered across Nigeria." },
    ],
  }),
  component: Index,
});

const CATS = [
  ["smartphones", "Smartphones", "/images/phone.jpg"],
  ["laptops", "Laptops", "/images/laptop.jpg"],
  ["tablets", "Tablets", "/images/tablet.jpg"],
  ["audio", "Audio", "/images/headphones.jpg"],
  ["smart-watches", "Watches", "/images/watch.jpg"],
  ["gaming", "Gaming", "/images/controller.jpg"],
] as const;

function Index() {
  const { data: featured = [] } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,brand,price,discount_price,images,stock")
        .eq("featured", true)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img src={hero} alt="Smartphone, laptop and earbuds" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover object-right opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-32">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Authentic · Warrantied · Delivered</span>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight md:text-6xl">The latest tech, priced right for Nigeria.</h1>
          <p className="mt-4 max-w-md opacity-80">Flagship phones, work-ready laptops and everyday accessories — from trusted brands, shipped to all 36 states.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="rounded-lg bg-gold px-6 py-3 font-semibold text-accent-foreground hover:opacity-90">Shop now</Link>
            <Link to="/shop" search={{ category: "smartphones" }} className="rounded-lg border border-ink-foreground/30 px-6 py-3 font-semibold hover:bg-ink-foreground/10">
              Browse phones
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
          {[
            [ShieldCheck, "100% genuine", "Official warranty"],
            [Truck, "Nationwide delivery", "Lagos in 24–48h"],
            [Wallet, "Pay on delivery", "Or bank transfer"],
            [Headphones, "Real support", "Mon–Sat, 9am–6pm"],
          ].map(([Icon, t, s]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={t as string} className="flex items-center gap-3">
                <I className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">{t as string}</div>
                  <div className="text-xs text-muted-foreground">{s as string}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-bold">Shop by category</h2>
        <div className="mt-6 grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATS.map(([slug, label, img]) => (
            <Link key={slug} to="/shop" search={{ category: slug }} className="group rounded-xl border bg-card p-3 text-center shadow-card">
              <img src={img} alt={label} loading="lazy" className="mx-auto aspect-square w-full rounded-lg object-cover transition group-hover:scale-105" />
              <div className="mt-2 text-sm font-semibold">{label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured deals</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary">View all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-4">
        <div className="rounded-2xl bg-ink-gradient p-8 text-ink-foreground md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">10% off your first order</h2>
          <p className="mt-2 opacity-80">Use code <span className="rounded bg-gold px-2 py-0.5 font-bold text-accent-foreground">WELCOME10</span> at checkout on orders above ₦50,000.</p>
        </div>
      </section>
    </div>
  );
}
