import { Link } from "@tanstack/react-router";
import { naira } from "@/lib/format";

export type ProductLite = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  price: number;
  discount_price: number | null;
  images: string[];
  stock: number;
};

export function ProductCard({ p }: { p: ProductLite }) {
  const off = p.discount_price ? Math.round((1 - p.discount_price / p.price) * 100) : 0;
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-gold px-2 py-0.5 text-xs font-bold text-accent-foreground">-{off}%</span>
        )}
        {p.stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-xs font-semibold text-ink-foreground">Out of stock</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.brand}</span>
        <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display text-base font-bold text-primary">{naira(p.discount_price ?? p.price)}</span>
          {p.discount_price && <span className="text-xs text-muted-foreground line-through">{naira(p.price)}</span>}
        </div>
      </div>
    </Link>
  );
}
