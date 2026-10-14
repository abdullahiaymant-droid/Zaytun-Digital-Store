import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  product_id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  color?: string;
  stock: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (id: string, color: string | undefined, q: number) => void;
  remove: (id: string, color: string | undefined) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "zaytun-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const same = (a: CartItem, id: string, c?: string) => a.product_id === id && (a.color ?? "") === (c ?? "");

  const value: CartCtx = {
    items,
    add: (item) =>
      setItems((prev) => {
        const ex = prev.find((p) => same(p, item.product_id, item.color));
        if (ex)
          return prev.map((p) =>
            same(p, item.product_id, item.color) ? { ...p, quantity: Math.min(p.stock, p.quantity + item.quantity) } : p,
          );
        return [...prev, item];
      }),
    setQty: (id, c, q) =>
      setItems((prev) => prev.map((p) => (same(p, id, c) ? { ...p, quantity: Math.max(1, Math.min(p.stock, q)) } : p))),
    remove: (id, c) => setItems((prev) => prev.filter((p) => !same(p, id, c))),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
