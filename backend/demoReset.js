import { randomUUID } from "crypto";

export async function resetDemoData({
  User,
  Order,
  Counter,
}) {
  const ordersResult = await Order.deleteMany({});

  await Counter.deleteOne({ _id: "order_no" });

  const usersResult = await User.deleteMany({
    role: "customer",
  });

  return {
    ok: true,
    orders_deleted: ordersResult.deletedCount || 0,
    customers_deleted: usersResult.deletedCount || 0,
    order_counter_reset: true,
  };
}