import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowRight, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, humanStatus, shortOrderId } from "@/lib/format";
import ApiUnavailable from "@/components/ApiUnavailable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  const statusColors = {
    placed: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    preparing: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    ready: "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90",
    out_for_delivery: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    delivered: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/orders/me`)
      .then(r => setOrders(r.data))
      .catch(err => setError(err.response?.data?.detail || "Unable to load orders right now."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-5 py-10">Loading...</div>;
  if (error) return <div className="max-w-4xl mx-auto px-5 py-10"><ApiUnavailable message={error} /></div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">My Orders</h1>
      <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">{orders.length} order{orders.length !== 1 && "s"}</p>

      {orders.length === 0 ? (
        <div className="mt-16 text-center text-stone-500 dark:text-stone-400">
          <ReceiptText size={48} className="mx-auto text-stone-200 dark:text-stone-700 mb-4" />
          <p>You have no orders yet.</p>
          <Link to="/menu" className="text-primary font-medium mt-2 inline-block hover:underline">Browse menu</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
           {orders.map(o => (
            <Link key={o.id} to={`/orders/${o.id}`}
              className="block soft-panel p-5 hover:border-primary/40 dark:hover:border-stone-600 transition-colors"
              data-testid={`order-row-${o.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">#{shortOrderId(o)}</span>
                    <Badge className={`${statusColors[o.status]} border-0 font-medium capitalize`}>{humanStatus(o.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-stone-700 dark:text-stone-300 truncate">
                    {o.items.slice(0, 2).map(i => `${i.qty}x ${i.name}`).join(", ")}
                    {o.items.length > 2 && ` + ${o.items.length - 2} more`}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg dark:text-stone-200">{formatMoney(o.total, { noPaise: true })}</div>
                  <ArrowRight size={16} className="text-stone-400 dark:text-stone-500 ml-auto mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
