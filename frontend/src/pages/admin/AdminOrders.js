import React, { useEffect, useState } from "react";
import axios from "axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ["placed", "preparing", "out_for_delivery", "delivered", "cancelled"];
const colors = {
  placed: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const load = () => axios.get(`${API}/admin/orders`).then(r => setOrders(r.data)).catch(() => {});
  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, []);

  const updateStatus = async (oid, status) => {
    try {
      await axios.put(`${API}/admin/orders/${oid}/status`, { status });
      toast.success("Status updated");
      load();
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">All Orders</h1>
      <p className="text-stone-500 text-sm mt-1">{orders.length} orders</p>

      <div className="mt-8 bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Order</th>
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Items</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Payment</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-stone-100 hover:bg-stone-50/50" data-testid={`admin-order-row-${o.id}`}>
                <td className="px-5 py-3 font-mono text-xs">#{o.id.slice(-6).toUpperCase()}<div className="text-stone-400 mt-1">{new Date(o.created_at).toLocaleString()}</div></td>
                <td className="px-5 py-3"><div className="font-medium">{o.address.full_name}</div><div className="text-xs text-stone-500">{o.address.phone}</div></td>
                <td className="px-5 py-3 max-w-xs">
                  <div className="text-xs text-stone-600 truncate">{o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
                </td>
                <td className="px-5 py-3 font-semibold">₹{o.total.toFixed(0)}</td>
                <td className="px-5 py-3">
                  <div className="text-xs capitalize">{o.payment_method}</div>
                  <Badge className={`${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"} border-0 text-[10px] mt-1`}>{o.payment_status}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className={`w-40 h-8 rounded-full border-0 text-xs font-medium ${colors[o.status]}`} data-testid={`status-select-${o.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
