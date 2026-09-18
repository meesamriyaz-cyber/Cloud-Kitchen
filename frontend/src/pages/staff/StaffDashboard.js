import React, { useEffect, useState } from "react";
import axios from "axios";
import { Clock3, ListOrdered, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanStatus, orderCustomer, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/orders`);
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const active = orders.filter(order => ["placed", "preparing", "ready", "out_for_delivery"].includes(order.status));

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <ListOrdered size={13} /> Staff operations
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 dark:text-stone-100">
            Staff Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Handle day-to-day orders and restaurant operations without administrator settings.
          </p>
        </div>
        <div>
          <Button variant="outline" className="rounded-full" onClick={loadOrders} disabled={loading}>
            <RefreshCw size={15} className={loading ? "mr-2 animate-spin" : "mr-2"} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <div className="soft-panel p-5">
          <Clock3 size={18} className="text-primary mb-3" />
          <div className="text-2xl font-bold dark:text-stone-100">{active.length}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">Active orders</div>
        </div>
        <div className="soft-panel p-5">
          <CheckCircle2 size={18} className="text-emerald-600 mb-3" />
          <div className="text-2xl font-bold dark:text-stone-100">{orders.filter(o => o.status === "delivered").length}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">Delivered orders</div>
        </div>
      </div>

      <section className="soft-panel p-5 mt-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold dark:text-stone-100">Order queue</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Operational order visibility for staff.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {orders.slice(0, 20).map(order => (
            <div key={order.id} className="rounded-xl border border-stone-200 dark:border-stone-700 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs text-stone-500">#{shortOrderId(order)}</div>
                <div className="font-semibold text-sm dark:text-stone-100 truncate">{orderCustomer(order)}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {order.items?.map(item => `${item.qty}x ${item.name}`).join(", ")}
                </div>
              </div>
              <Badge className="shrink-0 border-0 bg-primary text-white capitalize">{humanStatus(order.status)}</Badge>
            </div>
          ))}
          {!loading && orders.length === 0 && (
            <div className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">No orders yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
