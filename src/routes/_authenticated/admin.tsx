import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, ShoppingBag, Package, Boxes, Tag, Star, Ticket, Bell, BarChart3, ShieldCheck, ScrollText, LogOut, Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type Perm } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const [{ data: staff }, { data: perms }, { data: roles }] = await Promise.all([
      supabase.rpc("is_staff", { _uid: context.user.id }),
      supabase.rpc("my_perms"),
      supabase.from("user_roles").select("role").eq("user_id", context.user.id),
    ]);
    if (!staff) throw redirect({ to: "/account" });
    return { perms: (perms ?? []) as string[], roles: (roles ?? []).map((r) => r.role as string) };
  },
  head: () => ({
    meta: [
      { title: "Admin — Zaytun Digital Tech Store" },
      { name: "description", content: "Store management dashboard." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Store management." },
    ],
  }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: typeof Users; perm?: Perm }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Customers", icon: Users, perm: "customers_read" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, perm: "orders_read" },
  { to: "/admin/products", label: "Products", icon: Package, perm: "products" },
  { to: "/admin/categories", label: "Categories", icon: Tag, perm: "products" },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, perm: "inventory" },
  { to: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews" },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket, perm: "coupons" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, perm: "analytics" },
  { to: "/admin/staff", label: "Admin users", icon: ShieldCheck, perm: "staff" },
  { to: "/admin/audit", label: "Audit logs", icon: ScrollText, perm: "audit" },
];

function AdminLayout() {
  const { perms, roles, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false)).count ?? 0,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => qc.invalidateQueries({ queryKey: ["notif-unread"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const items = NAV.filter((n) => !n.perm || perms.includes(n.perm));
  const topRole = ["super_admin", "admin", "manager", "product_manager", "order_manager", "support"].find((r) => roles.includes(r));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-3 py-4 lg:flex-row lg:gap-6 lg:px-6">
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-60 lg:shrink-0">
        <div className="flex h-full flex-col rounded-2xl border bg-card p-3">
          <div className="hidden px-2 pb-3 lg:block">
            <div className="truncate text-sm font-semibold">{user.email}</div>
            <div className="text-xs text-muted-foreground">{topRole ? ROLE_LABEL[topRole] : "Staff"}</div>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-y-auto">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/admin" }}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "!bg-primary !text-primary-foreground font-semibold" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
                {n.label === "Notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-bold text-foreground">{unread}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-2 hidden gap-1 border-t pt-2 lg:flex lg:flex-col">
            <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><Store className="h-4 w-4" />View store</Link>
            <button onClick={signOut} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-4 w-4" />Log out</button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
        <button onClick={signOut} className="mt-8 flex items-center gap-2 text-sm text-muted-foreground lg:hidden"><LogOut className="h-4 w-4" />Log out ({user.email})</button>
      </main>
    </div>
  );
}
