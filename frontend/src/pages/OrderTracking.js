import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Check, Clock, Utensils, Bike, PackageCheck } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const steps = [
  { key: "placed", label: "Order Placed", icon: Check },
  { key: "preparing", label: "Preparing", icon: Utensils },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

export default function OrderTracking() {
  const { oid } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = () => axios.get(`${API}/orders/${oid}`).then(r => setOrder(r.data)).catch(() => {}).finally(() => setLoading(false));
    fetchOrder();
    const iv = setInterval(fetchOrder, 8000);
    return () => clearInterval(iv);
  }, [oid]);

  if (loading) return <div className="max-w-3xl mx-auto px-5 py-10">Loading...</div>;
  if (!order) return <div className="max-w-3xl mx-auto px-5 py-10">Order not found.</div>;

  const currentIdx = order.status === "cancelled" ? -1 : steps.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-xs uppercase tracking-widest text-stone-500">Order</div>
      <h1 className="font-display text-3xl font-bold tracking-tight">#{order.id.slice(-6).toUpperCase()}</h1>
      <p className="text-stone-500 text-sm mt-1">{new Date(order.created_at).toLocaleString()}</p>

      {order.status === "cancelled" ? (
        <div className="mt-8 p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          This order was cancelled.
        </div>
      ) : (
        <div className="mt-10 bg-white rounded-2xl border border-stone-200 p-6">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s.key} className="flex flex-col items-center text-center" data-testid={`step-${s.key}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${done ? "bg-[#E76F51] text-white" : "bg-stone-100 text-stone-400"}
                    ${active ? "ring-4 ring-[#E76F51]/20" : ""}`}>
                    <Icon size={16} />
                  </div>
                  <div className={`text-[11px] mt-2 font-medium ${done ? "text-stone-900" : "text-stone-400"}`}>{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 relative h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-[#E76F51] transition-all duration-500"
              style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="mt-4 text-sm text-stone-600 flex items-center gap-2 justify-center">
            <Clock size={14} />
            {order.status === "delivered" ? "Enjoy your meal!" : "Estimated delivery in ~30 minutes"}
          </div>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-display font-semibold mb-3">Items</h3>
          <div className="space-y-2 text-sm">
            {order.items.map(i => (
              <div key={i.dish_id} className="flex justify-between">
                <span>{i.qty}× {i.name}</span>
                <span>₹{(i.price * i.qty).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 space-y-1 text-sm text-stone-600">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{order.delivery_fee === 0 ? "Free" : `₹${order.delivery_fee}`}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>₹{order.tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-200"><span>Total</span><span>₹{order.total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-display font-semibold mb-3">Delivery to</h3>
          <div className="text-sm text-stone-700 space-y-1">
            <div className="font-medium">{order.address.full_name}</div>
            <div>{order.address.phone}</div>
            <div>{order.address.line1}, {order.address.city} — {order.address.pincode}</div>
            {order.address.notes && <div className="text-stone-500 italic">"{order.address.notes}"</div>}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 text-xs uppercase tracking-widest text-stone-500">Payment</div>
          <div className="text-sm mt-1 capitalize">{order.payment_method === "cod" ? "Cash on Delivery" : `Razorpay · ${order.payment_status}`}</div>
        </div>
      </div>
    </div>
  );
}
