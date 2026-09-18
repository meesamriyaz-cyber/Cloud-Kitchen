import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RefreshCcw, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApiUnavailable from "@/components/ApiUnavailable";
import { toast } from "sonner";
import { formatMoney, humanStatus, orderCustomer, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ORDER_STATUSES = ["placed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
const CHEF_NEXT_STATUSES = {
  placed: ["preparing"],
  preparing: ["ready"],
  ready: [],
  out_for_delivery: [],
  delivered: [],
  cancelled: [],
};

export default function ChefOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      // Chef needs the operational order queue, not POS permissions.
      // Keeping this on the admin-orders read endpoint avoids coupling the
      // kitchen role to counter-sale access.
      const res = await axios.get(`${API}/admin/orders`, { params });
      const orders = res.data || [];
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(orders);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load orders.");
    } finally {
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (oid, nextStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${oid}/status`, { status: nextStatus });
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
      load();
    }
  };

  const getNextStatuses = (currentStatus) => CHEF_NEXT_STATUSES[currentStatus] || [];

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
            <ChefHat size={13} /> Kitchen display
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 dark:text-stone-100">Chef Orders</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Update order status as dishes move through the kitchen.</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 h-10" data-testid="chef-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All orders</SelectItem>
              {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{humanStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700" onClick={load} disabled={refreshing}>
            <RefreshCcw size={15} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="mt-6"><ApiUnavailable message={error} onRetry={load} /></div>}

      <div className="mt-6 grid gap-3">
        {orders.length === 0 && <div className="soft-panel p-8 text-center text-stone-500 dark:text-stone-400">No orders to show.</div>}
        {orders.map(order => {
          const nextStatuses = getNextStatuses(order.status);
          return (
            <div key={order.id} className="soft-panel p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">#{shortOrderId(order)}</span>
                    <Badge className={`border-0 capitalize text-[10px] ${order.status === "placed" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : order.status === "preparing" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : order.status === "ready" ? "bg-primary/10 dark:bg-primary/20 text-primary" : order.status === "out_for_delivery" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : order.status === "delivered" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"}`}>
                      {humanStatus(order.status)}
                    </Badge>
                    <span className="text-xs text-stone-500 dark:text-stone-400 capitalize">{order.channel || "web"} · {order.order_type || "delivery"}</span>
                  </div>
                  <div className="font-semibold text-sm mt-1 dark:text-stone-200">{orderCustomer(order)}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 truncate">{order.items?.map(i => `${i.qty}x ${i.name}`).join(", ")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm dark:text-stone-200">{formatMoney(order.total, { noPaise: true })}</span>
                  {nextStatuses.length > 0 ? (
                    <Select value="" onValueChange={(v) => updateStatus(order.id, v)}>
                      <SelectTrigger className="rounded-full h-9 w-40 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid={`chef-status-${order.id}`}>
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        {nextStatuses.map(s => <SelectItem key={s} value={s}>{humanStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-stone-500 dark:text-stone-400">Final state</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
