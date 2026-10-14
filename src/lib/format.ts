export const naira = (n: number | string | null | undefined) =>
  "₦" + Number(n ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const statusLabel: Record<string, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"];
export const TRACK_STEPS = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
export const CLOSED_STATUSES = ["cancelled", "returned", "refunded"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

export const NG_STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

export const shippingFor = (state: string, subtotal: number) =>
  subtotal >= 500000 ? 0 : state.toLowerCase() === "lagos" ? 2500 : 5000;

export const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const d = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—");
