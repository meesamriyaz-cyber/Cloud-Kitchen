import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  placed: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/orders/me`).then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-5 py-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">My Orders</h1>
      <p className="text-stone-500 text-sm mt-1">{orders.length} order{orders.length !== 1 && "s"}</p>

      {orders.length === 0 ? (
        <div className="mt-16 text-center text-stone-500">
          <p>You have no orders yet.</p>
          <Link to="/menu" className="text-[#E76F51] font-medium mt-2 inline-block">Browse menu →</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map(o => (
            <Link key={o.id} to={`/orders/${o.id}`}
              className="block bg-white rounded-2xl border border-stone-200 p-5 hover:border-[#E76F51]/40 transition-colors"
              data-testid={`order-row-${o.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-stone-500">#{o.id.slice(-6).toUpperCase()}</span>
                    <Badge className={`${statusColors[o.status]} border-0 font-medium capitalize`}>{o.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-stone-700 truncate">
                    {o.items.slice(0, 2).map(i => `${i.qty}× ${i.name}`).join(", ")}
                    {o.items.length > 2 && ` + ${o.items.length - 2} more`}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">₹{o.total.toFixed(0)}</div>
                  <ArrowRight size={16} className="text-stone-400 ml-auto mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
