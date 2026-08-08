import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Banknote,
  ChefHat,
  Clock,
  CreditCard,
  Minus,
  Plus,
  Printer,
  RefreshCcw,
  ReceiptText,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  Utensils,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, humanStatus, orderCustomer, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const paymentOptions = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

  const statusColors = {
  placed: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function printReceipt(order) {
  const receipt = window.open("", "mukhtar-receipt", "width=420,height=640");
  if (!receipt) {
    toast.error("Allow popups to print the receipt");
    return;
  }

  const rows = order.items.map(item => `
    <tr>
      <td>${escapeHtml(item.name)} x ${item.qty}</td>
      <td style="text-align:right">${formatMoney(item.price * item.qty)}</td>
    </tr>
  `).join("");

  receipt.document.write(`
    <html>
      <head>
        <title>Receipt ${escapeHtml(shortOrderId(order))}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1c1917; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          .muted { color: #78716c; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          td { padding: 6px 0; border-bottom: 1px solid #e7e5e4; }
          .total { font-weight: 700; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>Mukhtar Cloud Kitchen</h1>
        <div class="muted">Order #${escapeHtml(shortOrderId(order))}</div>
        <div class="muted">${escapeHtml(new Date(order.created_at).toLocaleString())}</div>
        <div class="muted">Customer: ${escapeHtml(orderCustomer(order))}</div>
        <table>
          ${rows}
          <tr><td>Subtotal</td><td style="text-align:right">${formatMoney(order.subtotal)}</td></tr>
          <tr><td>Tax</td><td style="text-align:right">${formatMoney(order.tax)}</td></tr>
          <tr class="total"><td>Total</td><td style="text-align:right">${formatMoney(order.total)}</td></tr>
        </table>
      </body>
    </html>
  `);
  receipt.document.close();
  receipt.focus();
  receipt.print();
}

export default function POS() {
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);
  const [recent, setRecent] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("takeaway");
  const [tableNo, setTableNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [paymentStep, setPaymentStep] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [upiDeepLink, setUpiDeepLink] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [upiCopied, setUpiCopied] = useState(false);

  const loadMenu = async () => {
    const [dishRes, catRes] = await Promise.all([axios.get(`${API}/dishes`), axios.get(`${API}/categories`)]);
    setDishes(dishRes.data);
    setCats(catRes.data);
  };

  const loadRecent = async () => {
    const res = await axios.get(`${API}/pos/orders`);
    setRecent(res.data);
  };

  useEffect(() => {
    loadMenu().catch(() => toast.error("Failed to load menu"));
    loadRecent().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return dishes.filter(dish => {
      if (activeCat !== "all" && dish.category_id !== activeCat) return false;
      if (q && !dish.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [activeCat, dishes, q]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const deliveryFee = orderType === "delivery" && subtotal > 0 && subtotal < 499 ? 39 : 0;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
    return { subtotal, deliveryFee, tax, total };
  }, [cart, orderType]);

  const cartQty = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const activeRecent = useMemo(() => recent.filter(order => ["placed", "preparing", "ready"].includes(order.status)).length, [recent]);

  const addDish = (dish) => {
    if (!dish.is_available) {
      toast.error("This dish is unavailable");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.dish_id === dish.id);
      if (existing) {
        return prev.map(item => item.dish_id === dish.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { dish_id: dish.id, name: dish.name, price: dish.price, image_url: dish.image_url, qty: 1 }];
    });
  };

  const updateQty = (dishId, qty) => {
    setCart(prev => qty <= 0
      ? prev.filter(item => item.dish_id !== dishId)
      : prev.map(item => item.dish_id === dishId ? { ...item, qty } : item)
    );
  };

  const placeOrder = async () => {
    if (!cart.length) {
      toast.error("Add at least one item");
      return;
    }
    if (orderType === "dine_in" && !tableNo.trim()) {
      toast.error("Enter the table number");
      return;
    }

    setPlacing(true);
    try {
      const res = await axios.post(`${API}/pos/orders`, {
        items: cart,
        customer_name: customerName || "Walk-in",
        customer_phone: customerPhone,
        order_type: orderType,
        table_no: tableNo,
        payment_method: paymentMethod,
      });
      setLastOrder(res.data);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setTableNo("");
      setCashReceived("");
      setPaymentLink("");
      setUpiDeepLink("");
      setPaymentStep("pending");
      await loadRecent();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create POS order");
    } finally {
      setPlacing(false);
    }
  };

  const confirmPayment = async () => {
    if (!lastOrder) return;
    try {
      const res = await axios.post(`${API}/pos/orders/${lastOrder.id}/pay`);
      setLastOrder(res.data);
      setPaymentStep("completed");
      toast.success("Payment confirmed");
      setTimeout(() => {
        setPaymentStep(null);
        setLastOrder(null);
        setPaymentLink("");
        setUpiDeepLink("");
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Payment failed");
    }
  };

  const generatePaymentLink = async () => {
    if (!lastOrder) return;
    try {
      const res = await axios.post(`${API}/pos/orders/${lastOrder.id}/payment-link`);
      setPaymentLink(res.data.link_url);
      toast.success("Payment link created");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create payment link");
    }
  };

  const generateUpiDeepLink = async () => {
    if (!lastOrder) return;
    try {
      const res = await axios.post(`${API}/pos/orders/${lastOrder.id}/upi-deep-link`, { upi_id: "mukhtar@okhdfcbank" });
      setUpiDeepLink(res.data.upi_url);
      setUpiQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.data.upi_url)}`);
      setUpiCopied(false);
      toast.success("UPI link ready");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create UPI link");
    }
  };

  const openUpiApp = () => {
    if (!upiDeepLink) return;
    window.location.href = upiDeepLink;
  };

  const copyUpiLink = async () => {
    if (!upiDeepLink) return;
    try {
      await navigator.clipboard.writeText(upiDeepLink);
      setUpiCopied(true);
      toast.success("UPI link copied");
      setTimeout(() => setUpiCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const openPaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-5 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
            <ChefHat size={13} /> Staff terminal
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Point of Sale</h1>
          <p className="text-stone-500 text-sm mt-1">Create counter, pickup, dine-in, and staff-assisted delivery orders.</p>
        </div>
        <div className="flex gap-2">
          {lastOrder && (
            <Button variant="outline" className="rounded-full" onClick={() => printReceipt(lastOrder)}>
              <Printer size={16} className="mr-2" /> Print last
            </Button>
          )}
          <Button variant="outline" className="rounded-full" onClick={() => { loadMenu(); loadRecent(); }}>
            <RefreshCcw size={16} className="mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Ticket", value: formatMoney(totals.total, { noPaise: true }), icon: ReceiptText },
          { label: "Items", value: cartQty, icon: ShoppingBag },
          { label: "Active POS", value: activeRecent, icon: Utensils },
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="soft-panel p-4">
              <Icon size={16} className="text-orange-700" />
              <div className="font-display text-xl font-bold mt-2">{metric.value}</div>
              <div className="text-xs text-stone-500">{metric.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="soft-panel p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search menu"
                  className="pl-10 h-11 rounded-full bg-stone-50 border-stone-200"
                  data-testid="pos-search-input"
                />
              </div>
              <Select value={activeCat} onValueChange={setActiveCat}>
                <SelectTrigger className="md:w-64 h-11 rounded-full bg-stone-50" data-testid="pos-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {cats.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveCat("all")}
                className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold border ${activeCat === "all" ? "bg-orange-600 text-white border-orange-600" : "bg-white text-stone-700 border-stone-200"}`}
              >
                All
              </button>
              {cats.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold border ${activeCat === cat.id ? "bg-orange-600 text-white border-orange-600" : "bg-white text-stone-700 border-stone-200"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(dish => (
              <motion.button
                key={dish.id}
                whileTap={{ scale: dish.is_available ? 0.985 : 1 }}
                onClick={() => addDish(dish)}
                className={`text-left bg-white border border-stone-200 overflow-hidden hover:border-emerald-700/40 transition-colors touch-card ${!dish.is_available ? "opacity-50" : ""}`}
                data-testid={`pos-dish-${dish.id}`}
              >
                {dish.image_url && <img src={dish.image_url} alt={dish.name} className="w-full aspect-[4/3] object-cover bg-stone-100" />}
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={dish.veg ? "veg-dot mt-1" : "nonveg-dot mt-1"} title={dish.veg ? "Veg" : "Non-veg"} />
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold leading-snug">{dish.name}</div>
                      <div className="text-xs text-stone-500 mt-1">{formatMoney(dish.price, { noPaise: true })}</div>
                    </div>
                    <Plus size={16} className="text-orange-700 shrink-0" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 self-start">
          <div className="soft-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Current order</h2>
              <Badge className="bg-stone-100 text-stone-700 border-0">{cartQty} items</Badge>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <Label>Order type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger className="mt-1 rounded-xl" data-testid="pos-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="dine_in">Dine-in</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1 rounded-xl" data-testid="pos-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="inline-flex items-center gap-2"><Icon size={14} /> {option.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderType === "dine_in" && (
              <div className="mt-3">
                <Label>Table number</Label>
                <Input value={tableNo} onChange={(event) => setTableNo(event.target.value)} className="mt-1 rounded-xl" data-testid="pos-table-no" />
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in" className="mt-1 rounded-xl" data-testid="pos-customer-name" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Optional" className="mt-1 rounded-xl" data-testid="pos-customer-phone" />
              </div>
            </div>

            <div className="mt-5 max-h-[280px] overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  <ShoppingBag className="mx-auto text-stone-300" />
                  <div className="text-sm mt-2">Tap dishes to build an order.</div>
                </div>
              ) : cart.map(item => (
                <div key={item.dish_id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3" data-testid={`pos-cart-item-${item.dish_id}`}>
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-stone-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-xs text-stone-500">{formatMoney(item.price, { noPaise: true })}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded-full bg-stone-100 inline-flex items-center justify-center" onClick={() => updateQty(item.dish_id, item.qty - 1)}>
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                    <button className="w-7 h-7 rounded-full bg-stone-100 inline-flex items-center justify-center" onClick={() => updateQty(item.dish_id, item.qty + 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-stone-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              {totals.deliveryFee > 0 && <div className="flex justify-between text-stone-600"><span>Delivery</span><span>{formatMoney(totals.deliveryFee)}</span></div>}
              <div className="flex justify-between text-stone-600"><span>Tax</span><span>{formatMoney(totals.tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="rounded-full px-3" disabled={!cart.length} onClick={() => setCart([])}>
                <Trash2 size={16} />
              </Button>
              <Button className="flex-1 rounded-full bg-orange-600 hover:bg-orange-700" disabled={placing || !cart.length} onClick={placeOrder} data-testid="pos-place-order">
                {placing ? "Creating..." : "Create order"}
              </Button>
            </div>
          </div>

          <div className="soft-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Recent POS orders</h2>
              <Clock size={16} className="text-stone-400" />
            </div>
            <div className="mt-4 space-y-2">
              {recent.slice(0, 6).map(order => (
                <div key={order.id} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-stone-500">#{shortOrderId(order)}</div>
                      <div className="text-sm font-medium">{orderCustomer(order)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(order.total, { noPaise: true })}</div>
                      <Badge className={`${statusColors[order.status] || "bg-stone-100 text-stone-700"} border-0 capitalize text-[10px]`}>
                        {humanStatus(order.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {recent.length === 0 && <div className="text-sm text-stone-500 py-4">No POS orders yet.</div>}
            </div>
          </div>
        </aside>
      </div>

      {paymentStep && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold">Collect Payment</h3>
                <button onClick={() => { setPaymentStep(null); setLastOrder(null); }} className="p-1 hover:bg-stone-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {paymentStep === "pending" && (
                <div className="mt-6 space-y-4">
                  <div className="soft-panel p-4">
                    <div className="text-sm text-stone-500">Order #{shortOrderId(lastOrder)}</div>
                    <div className="text-2xl font-bold font-display mt-1">{formatMoney(lastOrder.total, { noPaise: true })}</div>
                    <div className="text-xs text-stone-500 mt-1 capitalize">{paymentMethod} payment</div>
                  </div>

                  {paymentMethod === "cash" && (
                    <div className="space-y-3">
                      <div>
                        <Label>Cash received (₹)</Label>
                        <Input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className="mt-1 rounded-xl"
                          placeholder="Enter amount"
                          data-testid="cash-received-input"
                        />
                      </div>
                      {Number(cashReceived) >= lastOrder.total && (
                        <div className="soft-panel p-3 bg-green-50 border-green-200">
                          <div className="text-sm text-green-800">
                            Change to return: <span className="font-bold">{formatMoney(Number(cashReceived) - lastOrder.total, { noPaise: true })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === "upi" && (
                    <div className="space-y-3">
                      <div className="soft-panel p-4 text-center space-y-3">
                        {upiQrUrl ? (
                          <img
                            src={upiQrUrl}
                            alt="UPI QR Code"
                            className="w-48 h-48 mx-auto rounded-lg border border-stone-200"
                          />
                        ) : (
                          <div className="w-48 h-48 mx-auto bg-stone-100 rounded-lg flex items-center justify-center border-2 border-dashed border-stone-300">
                            <div className="text-center">
                              <Smartphone size={48} className="mx-auto text-stone-400 mb-2" />
                              <div className="text-xs text-stone-500">QR Code</div>
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-stone-500">UPI ID</div>
                          <div className="font-mono text-sm font-semibold">mukhtar@okhdfcbank</div>
                        </div>
                        {upiDeepLink && (
                          <div className="text-left">
                            <div className="text-xs text-stone-500 mb-1">Payment Link</div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-stone-100 p-2 rounded break-all">{upiDeepLink}</code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full shrink-0"
                                onClick={copyUpiLink}
                              >
                                {upiCopied ? "Copied" : "Copy"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" className="w-full rounded-full" onClick={generateUpiDeepLink}>
                        <Smartphone size={16} className="mr-2" />
                        Generate UPI Link
                      </Button>
                      {upiDeepLink && (
                        <Button className="w-full rounded-full bg-green-600 hover:bg-green-700" onClick={openUpiApp}>
                          <Smartphone size={16} className="mr-2" />
                          Open UPI App
                        </Button>
                      )}
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-3">
                      <div className="soft-panel p-4 text-center space-y-3">
                        <CreditCard size={48} className="mx-auto text-stone-400" />
                        <div className="text-sm text-stone-600">Card Payment</div>
                        <div className="text-xs text-stone-500">Use Razorpay secure checkout</div>
                      </div>
                      <Button variant="outline" className="w-full rounded-full" onClick={generatePaymentLink}>
                        <CreditCard size={16} className="mr-2" />
                        Generate Payment Link
                      </Button>
                      {paymentLink && (
                        <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700" onClick={openPaymentLink}>
                          Pay with Card / UPI
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full rounded-full bg-green-600 hover:bg-green-700"
                    onClick={confirmPayment}
                    disabled={paymentMethod === "cash" && (!cashReceived || Number(cashReceived) < lastOrder.total)}
                    data-testid="confirm-payment-btn"
                  >
                    <CheckCircle2 size={16} className="mr-2" />
                    Confirm Payment
                  </Button>
                </div>
              )}

              {paymentStep === "completed" && (
                <div className="mt-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-display text-xl font-semibold">Payment Successful</div>
                    <div className="text-sm text-stone-500 mt-1">Order #{shortOrderId(lastOrder)} has been paid</div>
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={() => { setPaymentStep(null); setLastOrder(null); }}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
