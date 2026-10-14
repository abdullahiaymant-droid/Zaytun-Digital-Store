import { useRouteContext } from "@tanstack/react-router";

export type Perm = "orders" | "orders_read" | "customers" | "customers_read" | "products" | "inventory" | "coupons" | "reviews" | "analytics" | "staff" | "audit";

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  product_manager: "Product Manager",
  order_manager: "Order Manager",
  support: "Customer Support",
  customer: "Customer",
};
export const STAFF_ROLES = ["super_admin", "admin", "manager", "product_manager", "order_manager", "support"] as const;

/** Permissions are only used to hide controls; the database enforces every action. */
export function usePerms() {
  const ctx = useRouteContext({ from: "/_authenticated/admin" });
  const perms = ctx.perms as string[];
  return { perms, can: (p: Perm) => perms.includes(p) };
}

export const friendlyError = (e: unknown) => {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: string }).message) : String(e);
  if (/row-level security|permission denied|Not allowed/i.test(m)) return "You don't have permission to do that.";
  if (/duplicate key/i.test(m)) return "That already exists.";
  return m.length > 160 ? "Something went wrong. Please try again." : m;
};

export const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
