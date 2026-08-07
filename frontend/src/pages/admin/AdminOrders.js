import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, RefreshCcw, ListFilter, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatMoney, humanStatus, orderCustomer, orderPhone, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ["placed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
const colors = {
  placed: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const channelColors = {
  web: "bg-blue-50 text-blue-700",
  pos: "bg-orange-50 text-orange-700",
  android: "bg-green-50 text-green-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = {};
    if (channel !== "all") params.channel = channel;
    if (status !== "all") params.status = status;
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/admin/orders`, { params });
      setOrders(res.data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setRefreshing(false);
    }
  }, [channel, status]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const displayed = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(order => {
      const items = order.items?.map(item => item.name).join(" ") || "";
      return `${shortOrderId(order)} ${orderCustomer(order)} ${orderPhone(order)} ${items} ${order.channel}`.toLowerCase().includes(term);
    });
  }, [orders, q]);

  const counts = useMemo(() => ({
    active: orders.filter(o => ["placed", "preparing", "ready", "out_for_delivery"].includes(o.status)).length,
    web: orders.filter(o => o.channel === "web").length,
    pos: orders.filter(o => o.channel === "pos").length,
    paid: orders.filter(o => o.payment_status === "paid").length,
  }), [orders]);

  const updateStatus = async (oid, nextStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${oid}/status`, { status: nextStatus });
      toast.success("Status updated");
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
            <ListFilter size={13} /> Live order desk
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">All Orders</h1>
          <p className="text-stone-500 text-sm mt-1">{displayed.length} visible from {orders.length} loaded orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full bg-white" onClick={() => window.print()} data-testid="admin-print-orders">
            <Printer size={15} className="mr-2" /> Print
          </Button>
          <Button variant="outline" className="rounded-full bg-white" onClick={load} disabled={refreshing}>
            <RefreshCcw size={15} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Active", counts.active],
          ["Online", counts.web],
          ["POS", counts.pos],
          ["Paid", counts.paid],
        ].map(([label, value]) => (
          <div key={label} className="soft-panel p-4">
            <div className="text-2xl font-bold font-display">{value}</div>
            <div className="text-xs text-stone-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 soft-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px]">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search order, customer, phone, or dish"
              className="pl-10 h-11 rounded-full bg-white"
              data-testid="admin-orders-search"
            />
          </div>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="rounded-full bg-white h-11" data-testid="admin-orders-channel-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="web">Online app</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="android">Android</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-full bg-white h-11" data-testid="admin-orders-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{humanStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 soft-panel overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Order</th>
              <th className="text-left px-5 py-3">Channel</th>
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Items</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Payment</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(o => (
              <tr key={o.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors" data-testid={`admin-order-row-${o.id}`}>
                <td className="px-5 py-3 font-mono text-xs">
                  #{shortOrderId(o)}
                  <div className="text-stone-400 mt-1">{new Date(o.created_at).toLocaleString()}</div>
                </td>
                <td className="px-5 py-3">
                  <Badge className={`${channelColors[o.channel] || "bg-stone-100 text-stone-700"} border-0 uppercase text-[10px]`}>{o.channel || "web"}</Badge>
                  <div className="text-xs text-stone-500 mt-1 capitalize">{humanStatus(o.order_type)}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-semibold">{orderCustomer(o)}</div>
                  <div className="text-xs text-stone-500">{orderPhone(o) || "No phone"}</div>
                </td>
                <td className="px-5 py-3 max-w-xs">
                  <div className="text-xs text-stone-600 truncate">{o.items.map(i => `${i.qty}x ${i.name}`).join(", ")}</div>
                </td>
                <td className="px-5 py-3 font-semibold">{formatMoney(o.total, { noPaise: true })}</td>
                <td className="px-5 py-3">
                  <div className="text-xs capitalize">{o.payment_method}</div>
                  <Badge className={`${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"} border-0 text-[10px] mt-1`}>
                    {o.payment_status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className={`w-40 h-8 rounded-full border-0 text-xs font-semibold ${colors[o.status]}`} data-testid={`status-select-${o.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{humanStatus(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && <div className="py-12 text-center text-stone-500">No orders match this filter.</div>}
      </div>
    </div>
  );
}
