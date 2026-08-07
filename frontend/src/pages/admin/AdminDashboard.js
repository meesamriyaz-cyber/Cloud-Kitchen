import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  LayoutDashboard,
  ListOrdered,
  MonitorCog,
  Package,
  Printer,
  Tag,
  TrendingUp,
  Utensils,
  Users,
} from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, humanStatus, orderCustomer, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const activeStatuses = ["placed", "preparing", "ready", "out_for_delivery"];
const statusPalette = {
  placed: "#2563eb",
  preparing: "#d97706",
  ready: "#059669",
  out_for_delivery: "#7c3aed",
  delivered: "#16a34a",
  cancelled: "#dc2626",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total_orders: 0, revenue: 0, active: 0, delivered: 0, channels: {} });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get(`${API}/admin/stats`).then(r => setStats(r.data)).catch(() => {});
    axios.get(`${API}/admin/orders`).then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const tiles = [
    { label: "Total Orders", value: stats.total_orders, icon: Package, tint: "bg-orange-50 text-orange-700" },
    { label: "Revenue", value: formatMoney(stats.revenue, { noPaise: true }), icon: IndianRupee, tint: "bg-emerald-50 text-emerald-700" },
    { label: "Active", value: stats.active, icon: Clock, tint: "bg-amber-50 text-amber-700" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle2, tint: "bg-green-50 text-green-700" },
  ];

  const channelData = useMemo(() => ([
    { key: "web", label: "Online", count: stats.channels?.web?.count || 0, revenue: stats.channels?.web?.revenue || 0 },
    { key: "pos", label: "POS", count: stats.channels?.pos?.count || 0, revenue: stats.channels?.pos?.revenue || 0 },
    { key: "android", label: "Android", count: stats.channels?.android?.count || 0, revenue: stats.channels?.android?.revenue || 0 },
  ]), [stats.channels]);

  const statusData = useMemo(() => {
    const counts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const liveQueue = useMemo(() => orders
    .filter(order => activeStatuses.includes(order.status))
    .slice(0, 6), [orders]);

  const quickLinks = [
    { to: "/admin/orders", title: "Live Orders", copy: "Filter by channel and move orders through kitchen status.", icon: ListOrdered, accent: "bg-orange-50 text-orange-700" },
    { to: "/pos", title: "Open POS", copy: "Create walk-in, dine-in, pickup, and assisted delivery orders.", icon: MonitorCog, accent: "bg-emerald-50 text-emerald-700" },
    { to: "/admin/menu", title: "Manage Menu", copy: "Add dishes, update prices, and control availability.", icon: Utensils, accent: "bg-amber-50 text-amber-700" },
    { to: "/admin/users", title: "Users", copy: "Create and manage roles for staff and customers.", icon: Users, accent: "bg-blue-50 text-blue-700" },
    { to: "/admin/sales", title: "Sales Report", copy: "Revenue trends, channel breakdown, and top sellers.", icon: TrendingUp, accent: "bg-purple-50 text-purple-700" },
    { to: "/admin/offers", title: "Offers", copy: "Create and manage discount codes and promotions.", icon: Tag, accent: "bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E76F51]/10 text-[#E76F51] px-3 py-1 text-xs font-semibold">
            <LayoutDashboard size={13} /> Admin control room
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Kitchen Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">Online ordering, POS, and kitchen throughput at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full bg-white" onClick={() => window.print()} data-testid="admin-print-report">
            <Printer size={15} className="mr-2" /> Print Report
          </Button>
          <Link to="/admin/orders" className="rounded-full bg-white border border-stone-200 h-10 px-4 inline-flex items-center gap-2 text-sm font-semibold">
            Orders <ArrowRight size={15} />
          </Link>
          <Link to="/pos" className="rounded-full bg-orange-600 hover:bg-orange-700 text-white h-10 px-4 inline-flex items-center gap-2 text-sm font-semibold">
            POS <MonitorCog size={15} />
          </Link>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="soft-panel p-5" data-testid={`stat-${t.label.toLowerCase().replace(/\s/g, '-')}`}>
              <div className={`w-10 h-10 rounded-full ${t.tint} flex items-center justify-center mb-4`}>
                <Icon size={17} />
              </div>
              <div className="text-2xl font-bold font-display">{t.value}</div>
              <div className="text-xs text-stone-500 mt-1">{t.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <section className="soft-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Channel performance</h2>
              <p className="text-xs text-stone-500 mt-1">Orders and paid/delivered revenue by source.</p>
            </div>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(value, name) => name === "revenue" ? formatMoney(value, { noPaise: true }) : value} />
                <Bar dataKey="revenue" fill="#C2410C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="soft-panel p-5">
          <h2 className="font-display text-xl font-semibold">Live kitchen queue</h2>
          <p className="text-xs text-stone-500 mt-1">Newest active orders across web and POS.</p>
          <div className="mt-5 space-y-3">
            {liveQueue.map(order => (
              <Link key={order.id} to={`/admin/orders`} className="block rounded-lg border border-stone-200 bg-white p-3 hover:border-emerald-700/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-stone-500">#{shortOrderId(order)}</div>
                    <div className="font-semibold text-sm truncate">{orderCustomer(order)}</div>
                    <div className="text-xs text-stone-500 truncate">{order.items?.map(item => `${item.qty}x ${item.name}`).join(", ")}</div>
                  </div>
                  <Badge className="border-0 capitalize bg-orange-600 text-white shrink-0">
                    {humanStatus(order.status)}
                  </Badge>
                </div>
              </Link>
            ))}
            {liveQueue.length === 0 && <div className="text-sm text-stone-500 py-8 text-center">No active orders in the queue.</div>}
          </div>
        </section>
      </div>

      <div className="mt-7 grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
        <section className="soft-panel p-5">
          <h2 className="font-display text-xl font-semibold">Status mix</h2>
          <div className="mt-5 h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {statusData.map(item => <Cell key={item.status} fill={statusPalette[item.status] || "#78716c"} />)}
                  </Pie>
                  <Tooltip formatter={(value, _name, item) => [value, humanStatus(item.payload.status)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-stone-500">No order status data yet.</div>
            )}
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="soft-panel p-5 hover:border-[#E76F51]/40 transition-colors"
                data-testid={`admin-goto-${link.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${link.accent}`}>
                  <Icon size={17} />
                </div>
                <div className="font-display text-lg font-semibold">{link.title}</div>
                <div className="text-sm text-stone-500 mt-1">{link.copy}</div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
