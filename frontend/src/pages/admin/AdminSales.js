import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RefreshCcw, TrendingUp, Printer } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApiUnavailable from "@/components/ApiUnavailable";
import { formatMoney, humanStatus, orderCustomer, orderPhone, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const channelColors = {
  web: "#2563eb",
  pos: "#0f172a",
  android: "#16a34a",
};

export default function AdminSales() {
  const [report, setReport] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("daily");

  const setDaily = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    const to = from;
    setFrom(from);
    setTo(to);
    setPeriod("daily");
  };

  const setMonthly = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    setFrom(from);
    setTo(to);
    setPeriod("monthly");
  };

  const setYearly = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);
    setFrom(from);
    setTo(to);
    setPeriod("yearly");
  };

  const printReport = () => {
    const reportTitle = period === "daily" ? "Daily Sales Report" : period === "monthly" ? "Monthly Sales Report" : "Yearly Sales Report";
    const printContent = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1c1917; }
            h1 { font-size: 22px; margin: 0 0 4px; }
            .muted { color: #78716c; font-size: 12px; }
            .meta { color: #78716c; font-size: 12px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
            .tile { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px; }
            .tile .value { font-size: 20px; font-weight: 700; }
            .tile .label { font-size: 11px; color: #78716c; text-transform: uppercase; letter-spacing: 0.08em; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e7e5e4; }
            th { color: #78716c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
            .right { text-align: right; }
            .section { margin-top: 18px; }
            .section h2 { font-size: 16px; margin: 0 0 8px; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <div class="meta">${new Date().toLocaleString()} | Mukhtar Cloud Kitchen</div>
          <div class="grid">
            <div class="tile"><div class="value">${formatMoney(report?.revenue || 0, { noPaise: true })}</div><div class="label">Revenue</div></div>
            <div class="tile"><div class="value">${report?.orders || 0}</div><div class="label">Orders</div></div>
            <div class="tile"><div class="value">${Object.keys(report?.channels || {}).length}</div><div class="label">Channels</div></div>
            <div class="tile"><div class="value">${topItems[0]?.name || "-"}</div><div class="label">Top Seller</div></div>
          </div>
          <div class="section">
            <h2>Channel Breakdown</h2>
            <table>
              <tr><th>Channel</th><th class="right">Orders</th><th class="right">Revenue</th></tr>
              ${Object.entries(report?.channels || {}).map(([key, value]) => `<tr><td>${key.toUpperCase()}</td><td class="right">${value.orders}</td><td class="right">${formatMoney(value.revenue, { noPaise: true })}</td></tr>`).join("")}
            </table>
          </div>
          <div class="section">
            <h2>Top Selling Items</h2>
            <table>
              <tr><th>#</th><th>Item</th><th class="right">Qty Sold</th><th class="right">Revenue</th></tr>
              ${topItems.map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.name}</td><td class="right">${item.qty}</td><td class="right">${formatMoney(item.revenue, { noPaise: true })}</td></tr>`).join("")}
            </table>
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) { toast.error("Allow popups to print reports"); return; }
    win.document.write(printContent);
    win.document.close();
    win.focus();
    win.print();
  };

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (channel !== "all") params.channel = channel;
      const res = await axios.get(`${API}/admin/sales/report`, { params });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load sales report.");
    } finally {
      setRefreshing(false);
    }
  }, [from, to, channel]);

  useEffect(() => { load(); }, [load]);

  const channelData = useMemo(() => {
    if (!report?.channels) return [];
    return Object.entries(report.channels).map(([key, value]) => ({ key, label: key.toUpperCase(), ...value }));
  }, [report]);

  const statusData = useMemo(() => {
    if (!report?.statuses) return [];
    return Object.entries(report.statuses).map(([status, orders]) => ({ status: status.replace(/_/g, " "), orders }));
  }, [report]);

  const dailyData = useMemo(() => report?.daily || [], [report]);

  const topItems = useMemo(() => report?.items || [], [report]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
           <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
            <TrendingUp size={13} /> Analytics
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 dark:text-stone-100">Sales Report</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Revenue, channel performance, top sellers, and daily trends.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setDaily} className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700">Daily</Button>
            <Button variant="outline" size="sm" onClick={setMonthly} className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700">Monthly</Button>
            <Button variant="outline" size="sm" onClick={setYearly} className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700">Yearly</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700" onClick={printReport}>
              <Printer size={15} className="mr-2" /> Print
            </Button>
            <Button variant="outline" className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700" onClick={load} disabled={refreshing}>
              <RefreshCcw size={15} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="mt-6"><ApiUnavailable message={error} onRetry={load} /></div>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Revenue", formatMoney(report?.revenue || 0, { noPaise: true })],
          ["Orders", report?.orders || 0],
          ["Channels", Object.keys(report?.channels || {}).length],
          ["Top seller", topItems[0]?.name || "-"],
        ].map(([label, value]) => (
          <div key={label} className="soft-panel p-4 border-l-4 border-l-primary">
             <div className="text-2xl font-bold font-display dark:text-stone-200">{value}</div>
             <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 soft-panel p-5 border-t-4 border-t-primary">
          <h2 className="font-display text-xl font-semibold dark:text-stone-100">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
           <div>
             <Label className="text-stone-700 dark:text-stone-300">From</Label>
             <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 rounded-xl dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="sales-from" />
           </div>
           <div>
             <Label className="text-stone-700 dark:text-stone-300">To</Label>
             <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 rounded-xl dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="sales-to" />
           </div>
           <div>
             <Label className="text-stone-700 dark:text-stone-300">Channel</Label>
             <Select value={channel} onValueChange={setChannel}>
               <SelectTrigger className="mt-1 rounded-xl dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="sales-channel"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="web">Online app</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-7 grid xl:grid-cols-2 gap-5">
        <section className="soft-panel p-5 border-t-4 border-t-emerald-600">
          <h2 className="font-display text-xl font-semibold dark:text-stone-100">Daily revenue</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Revenue trend for the selected period.</p>
          <div className="mt-5 h-72">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(value) => formatMoney(value, { noPaise: true })} />
                  <Bar dataKey="revenue" fill="#14532d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-sm text-stone-500 dark:text-stone-400">No daily data available.</div>
            )}
          </div>
        </section>

        <section className="soft-panel p-5 border-t-4 border-t-primary">
          <h2 className="font-display text-xl font-semibold dark:text-stone-100">Channel breakdown</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Orders and revenue by source.</p>
          <div className="mt-5 h-72">
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} dataKey="orders" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {channelData.map(item => <Cell key={item.key} fill={channelColors[item.key] || "#78716c"} />)}
                  </Pie>
                  <Tooltip formatter={(value, _name, item) => [value, item.payload.label]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-sm text-stone-500 dark:text-stone-400">No channel data available.</div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-7 grid xl:grid-cols-2 gap-5">
        <section className="soft-panel p-5 border-t-4 border-t-amber-500">
          <h2 className="font-display text-xl font-semibold dark:text-stone-100">Status mix</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Order status distribution for the selected period.</p>
          <div className="mt-5 h-72">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="orders" nameKey="status" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {statusData.map(item => <Cell key={item.status} fill={item.status.toLowerCase().includes('placed') ? '#2563eb' : item.status.toLowerCase().includes('deliver') ? '#16a34a' : item.status.toLowerCase().includes('cancel') ? '#dc2626' : '#d97706'} />)}
                  </Pie>
                  <Tooltip formatter={(value, _name, item) => [value, humanStatus(item.payload.status)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-sm text-stone-500 dark:text-stone-400">No status data available.</div>
            )}
          </div>
        </section>

        <section className="soft-panel p-5 border-t-4 border-t-purple-500">
          <h2 className="font-display text-xl font-semibold dark:text-stone-100">Top selling items</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Best performing dishes by quantity sold.</p>
          <div className="mt-5 space-y-2">
            {topItems.length > 0 ? topItems.map((item, idx) => (
               <div key={item.name} className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
                 <div className="flex items-center gap-3">
                   <Badge className="bg-stone-900 dark:bg-stone-700 text-white border-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{idx + 1}</Badge>
                   <div>
                     <div className="text-sm font-semibold dark:text-stone-200">{item.name}</div>
                     <div className="text-xs text-stone-500 dark:text-stone-400">{item.qty} sold</div>
                   </div>
                 </div>
                 <div className="text-sm font-semibold dark:text-stone-200">{formatMoney(item.revenue, { noPaise: true })}</div>
               </div>
             )) : <div className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">No sales data yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
