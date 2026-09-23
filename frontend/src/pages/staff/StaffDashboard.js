import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock3, ListOrdered, RefreshCw, CheckCircle2, AlertCircle, Banknote, Smartphone, CreditCard, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanStatus, orderCustomer, shortOrderId, formatMoney } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ACTIVE_STATUSES = ["placed", "preparing", "ready", "out_for_delivery"];

export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [collectingPayment, setCollectingPayment] = useState(false);
  const navigate = useNavigate();

  const loadOrders = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API}/admin/orders`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError(err.response?.data?.detail || "Could not load orders. Check your connection and refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1;
    const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }), [orders]);

  const active = orders.filter(order => ACTIVE_STATUSES.includes(order.status));
  const staffNextStatus = { ready: "out_for_delivery", out_for_delivery: "delivered" };

  const collectPayment = async () => {
    if (!paymentOrder || collectingPayment) return;

    const amount = Number(paymentOrder.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Invalid order total.");
      return;
    }

    if (paymentMethod === "cash" && (!cashReceived || Number(cashReceived) < amount)) {
      toast.error("Cash received must cover the order total.");
      return;
    }

    setCollectingPayment(true);
    try {
      const res = await axios.post(`${API}/delivery/orders/${paymentOrder.id}/pay`, {
        method: paymentMethod,
        amount,
      });
      setOrders(prev => prev.map(order => order.id === res.data.id ? res.data : order));
      setPaymentOrder(null);
      setCashReceived("");
      toast.success("COD payment collected.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unable to collect payment.");
      await loadOrders({ quiet: true });
    } finally {
      setCollectingPayment(false);
    }
  };

  const updateStatus = async (order, nextStatus) => {
    if (busyOrderId) return;
    if (nextStatus === "delivered" && order.payment_status !== "paid") {
      toast.error("Confirm payment collection before marking this order delivered.");
      return;
    }
    setBusyOrderId(order.id);
    try {
      await axios.put(`${API}/admin/orders/${order.id}/status`, { status: nextStatus });
      toast.success("Order moved to " + humanStatus(nextStatus));
      await loadOrders({ quiet: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unable to update order status.");
      await loadOrders({ quiet: true });
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <ListOrdered size={13} /> Staff operations
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 dark:text-stone-100">Staff Dashboard</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Handle day-to-day orders and restaurant operations without administrator settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-full" onClick={() => navigate("/pos")}>Open POS</Button>
          <Button variant="outline" className="rounded-full" onClick={() => loadOrders()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "mr-2 animate-spin" : "mr-2"} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <div className="soft-panel p-5"><Clock3 size={18} className="text-primary mb-3" /><div className="text-2xl font-bold dark:text-stone-100">{active.length}</div><div className="text-xs text-stone-500 dark:text-stone-400 mt-1">Active orders</div></div>
        <div className="soft-panel p-5"><CheckCircle2 size={18} className="text-emerald-600 mb-3" /><div className="text-2xl font-bold dark:text-stone-100">{orders.filter(o => o.status === "delivered").length}</div><div className="text-xs text-stone-500 dark:text-stone-400 mt-1">Delivered orders</div></div>
      </div>

      <section className="soft-panel p-5 mt-7">
        <div><h2 className="font-display text-xl font-semibold dark:text-stone-100">Order queue</h2><p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Active orders are prioritized. Payment must be confirmed before delivery.</p></div>
        {loadError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} />{loadError}</div>}
        {loading && orders.length === 0 ? <div className="py-10 text-center text-sm text-stone-500">Loading orders…</div> : (
          <div className="mt-5 space-y-3">
            {sortedOrders.slice(0, 20).map(order => {
              const nextStatus = staffNextStatus[order.status];
              const unpaid = order.payment_status !== "paid";
              const busy = busyOrderId === order.id;
              return <div key={order.id} className="rounded-xl border border-stone-200 dark:border-stone-700 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-stone-500">#{shortOrderId(order)}</div>
                  <div className="font-semibold text-sm dark:text-stone-100 truncate">{orderCustomer(order)}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 truncate">{order.items?.map(item => `${item.qty}x ${item.name}`).join(", ")}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><Badge variant="outline">Payment: {unpaid ? "Pending" : "Paid"}</Badge><span className="text-xs text-stone-500">{String(order.payment_method || "").toUpperCase()}</span></div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Badge className="border-0 bg-primary text-white capitalize">{humanStatus(order.status)}</Badge>
                  {order.status === "out_for_delivery" && unpaid && order.payment_method === "cod" && (
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setPaymentOrder(order);
                        setPaymentMethod("cash");
                        setCashReceived("");
                      }}
                      disabled={Boolean(busyOrderId) || collectingPayment}
                    >
                      Collect payment
                    </Button>
                  )}
                  {nextStatus && <Button size="sm" className="rounded-full" onClick={() => updateStatus(order, nextStatus)} disabled={Boolean(busyOrderId) || (nextStatus === "delivered" && unpaid)} title={nextStatus === "delivered" && unpaid ? "Payment must be confirmed first" : undefined}>{busy ? "Updating…" : `Mark ${humanStatus(nextStatus)}`}</Button>}
                  {order.status === "out_for_delivery" && unpaid && <span className="text-xs text-amber-700">Confirm collection first</span>}
                </div>
              </div>;
            })}
            {!loadError && !loading && orders.length === 0 && <div className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">No orders yet.</div>}
          </div>
        )}
      </section>
      {paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold dark:text-stone-100">Collect COD Payment</h3>
                <button type="button" onClick={() => { setPaymentOrder(null); setCashReceived(""); }} className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
                <div className="text-xs text-stone-500 dark:text-stone-400">Order #{shortOrderId(paymentOrder)}</div>
                <div className="mt-1 text-2xl font-bold dark:text-stone-100">{formatMoney(paymentOrder.total, { noPaise: true })}</div>
                <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">Collect by Cash, UPI, or Card</div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "upi", label: "UPI", icon: Smartphone },
                  { value: "card", label: "Card", icon: CreditCard },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`rounded-xl border p-3 text-sm font-medium ${paymentMethod === value ? "border-primary bg-primary/10 text-primary" : "border-stone-200 dark:border-stone-700"}`}
                  >
                    <Icon size={18} className="mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="mt-4">
                  <label className="text-sm font-medium dark:text-stone-200">Cash received (₹)</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 dark:text-stone-100"
                    placeholder="Enter amount"
                  />
                  {Number(cashReceived) >= paymentOrder.total && (
                    <div className="mt-2 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                      Change to return: <strong>{formatMoney(Number(cashReceived) - paymentOrder.total, { noPaise: true })}</strong>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full mt-5 rounded-full bg-green-600 hover:bg-green-700"
                onClick={collectPayment}
                disabled={collectingPayment || (paymentMethod === "cash" && (!cashReceived || Number(cashReceived) < paymentOrder.total))}
              >
                {collectingPayment ? "Confirming…" : "Confirm payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
