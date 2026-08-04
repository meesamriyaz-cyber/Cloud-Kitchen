import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Package, IndianRupee, Clock, CheckCircle2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total_orders: 0, revenue: 0, active: 0, delivered: 0 });

  useEffect(() => {
    axios.get(`${API}/admin/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  const tiles = [
    { label: "Total Orders", value: stats.total_orders, icon: Package, tint: "bg-blue-50 text-blue-600" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, tint: "bg-green-50 text-green-600" },
    { label: "Active", value: stats.active, icon: Clock, tint: "bg-amber-50 text-amber-600" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-stone-500 text-sm mt-1">Kitchen at a glance</p>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map(t => {
          const I = t.icon;
          return (
            <div key={t.label} className="bg-white rounded-2xl border border-stone-200 p-5" data-testid={`stat-${t.label.toLowerCase().replace(/\s/g, '-')}`}>
              <div className={`w-9 h-9 rounded-full ${t.tint} flex items-center justify-center mb-3`}><I size={16} /></div>
              <div className="text-2xl font-bold font-display">{t.value}</div>
              <div className="text-xs text-stone-500 mt-1">{t.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        <Link to="/admin/menu" className="bg-white rounded-2xl border border-stone-200 p-6 hover:border-[#E76F51]/40 transition-colors" data-testid="admin-goto-menu">
          <div className="font-display text-lg font-semibold">Manage Menu</div>
          <div className="text-sm text-stone-500 mt-1">Add, edit and manage dishes & categories.</div>
        </Link>
        <Link to="/admin/orders" className="bg-white rounded-2xl border border-stone-200 p-6 hover:border-[#E76F51]/40 transition-colors" data-testid="admin-goto-orders">
          <div className="font-display text-lg font-semibold">Manage Orders</div>
          <div className="text-sm text-stone-500 mt-1">Update statuses and track live orders.</div>
        </Link>
      </div>
    </div>
  );
}
