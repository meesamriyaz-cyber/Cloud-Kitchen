export const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatMoney(value, options = {}) {
  const amount = Number(value) || 0;
  const formatted = money.format(amount);
  return options.noPaise ? formatted.replace(/\.00$/, "") : formatted;
}

export function shortOrderId(order) {
  if (order?.order_no) return String(order.order_no).padStart(4, "0");
  return String(order?.id || "").slice(-6).toUpperCase();
}

export function humanStatus(status) {
  return String(status || "").replace(/_/g, " ");
}

export function orderCustomer(order) {
  return order?.address?.full_name || order?.pos_customer_name || "Walk-in";
}

export function orderPhone(order) {
  return order?.address?.phone || order?.pos_customer_phone || "";
}
