import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Bike, CreditCard, MapPin, ShieldCheck, TicketPercent, Wallet, X } from "lucide-react";
import { formatMoney } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { items, subtotal, deliveryFee, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addr, setAddr] = useState({
    full_name: user?.name || "", phone: "", line1: "", city: "", pincode: "", notes: ""
  });
  const [method, setMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    setAppliedCoupon(null);
  }, [subtotal]);

  const discount = appliedCoupon?.discount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const payableTax = Math.round(taxable * 0.05 * 100) / 100;
  const payableTotal = Math.round((taxable + deliveryFee + payableTax) * 100) / 100;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Your cart is empty</h2>
        <Button className="mt-4 rounded-full bg-orange-600 hover:bg-orange-700" onClick={() => navigate("/menu")}>Browse Menu</Button>
      </div>
    );
  }

  const placeOrder = async (razorpayData = {}) => {
    const res = await axios.post(`${API}/orders`, {
      items, address: addr, payment_method: method, coupon_code: appliedCoupon?.code, ...razorpayData
    });
    clear();
    toast.success("Order placed successfully!");
    navigate(`/orders/${res.data.id}`);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    setCouponBusy(true);
    try {
      const res = await axios.post(`${API}/coupons/apply`, { code: couponCode.trim(), subtotal });
      setAppliedCoupon(res.data);
      setCouponCode(res.data.code);
      toast.success("Coupon applied");
    } catch (err) {
      setAppliedCoupon(null);
      toast.error(err.response?.data?.detail || "Invalid coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!addr.full_name || !addr.phone || !addr.line1 || !addr.city || !addr.pincode) {
      toast.error("Please fill all delivery details");
      return;
    }
    setPlacing(true);
    try {
      if (method === "cod") {
        await placeOrder();
      } else {
        const ok = await loadRazorpay();
        if (!ok) { toast.error("Failed to load payment"); return; }
        const cfg = await axios.get(`${API}/payments/razorpay/config`);
        if (!cfg.data.enabled) { toast.error("Online payments are not configured"); return; }
        const order = await axios.post(`${API}/payments/razorpay/order`, { amount: payableTotal });
        const options = {
          key: cfg.data.key_id,
          amount: order.data.amount,
          currency: order.data.currency,
          order_id: order.data.id,
          name: "Mukhtar Cloud Kitchen",
          description: "Food order",
          prefill: { name: addr.full_name, email: user?.email, contact: addr.phone },
          theme: { color: "#C2410C" },
          handler: async (resp) => {
            try {
              await placeOrder({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
            } catch (err) {
              toast.error("Payment verification failed");
            }
          },
          modal: { ondismiss: () => setPlacing(false) },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 grid md:grid-cols-3 gap-6">
      <form onSubmit={submit} className="md:col-span-2 space-y-8">
        <div className="soft-panel p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-semibold">
            <ShieldCheck size={13} /> Secure checkout
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Checkout</h1>
          <p className="text-stone-600 text-sm mt-1">Confirm delivery details, apply offers, and choose how you want to pay.</p>
        </div>

        <section className="soft-panel p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><MapPin size={18} /> Delivery details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input required value={addr.full_name} onChange={e => setAddr({...addr, full_name: e.target.value})} className="mt-1 h-11 rounded-xl" data-testid="checkout-name" /></div>
            <div><Label>Phone</Label><Input required value={addr.phone} onChange={e => setAddr({...addr, phone: e.target.value})} className="mt-1 h-11 rounded-xl" data-testid="checkout-phone" /></div>
          </div>
          <div><Label>Address</Label><Input required value={addr.line1} onChange={e => setAddr({...addr, line1: e.target.value})} className="mt-1 h-11 rounded-xl" data-testid="checkout-line1" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>City</Label><Input required value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} className="mt-1 h-11 rounded-xl" data-testid="checkout-city" /></div>
            <div><Label>Pincode</Label><Input required value={addr.pincode} onChange={e => setAddr({...addr, pincode: e.target.value})} className="mt-1 h-11 rounded-xl" data-testid="checkout-pincode" /></div>
          </div>
          <div><Label>Delivery notes (optional)</Label><Textarea value={addr.notes} onChange={e => setAddr({...addr, notes: e.target.value})} className="mt-1 rounded-xl" data-testid="checkout-notes" /></div>
        </section>

        <section className="soft-panel p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Coupon</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TicketPercent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="pl-10 h-11 rounded-xl"
                data-testid="checkout-coupon"
              />
            </div>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={applyCoupon} disabled={couponBusy}>
              Apply
            </Button>
          </div>
          {appliedCoupon && (
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              <span>{appliedCoupon.code} saved {formatMoney(appliedCoupon.discount)}</span>
              <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="p-1">
                <X size={14} />
              </button>
            </div>
          )}
        </section>

        <section className="soft-panel p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><CreditCard size={18} /> Payment</h2>
          <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 has-[:checked]:border-orange-600 has-[:checked]:bg-orange-50/40 cursor-pointer">
              <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
              <Wallet size={18} className="text-stone-500" />
              <div className="flex-1">
                <div className="font-medium text-sm">Cash on Delivery</div>
                <div className="text-xs text-stone-500">Pay when your food arrives.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 has-[:checked]:border-orange-600 has-[:checked]:bg-orange-50/40 cursor-pointer">
              <RadioGroupItem value="razorpay" id="rzp" data-testid="payment-razorpay" />
              <CreditCard size={18} className="text-stone-500" />
              <div className="flex-1">
                <div className="font-medium text-sm">Pay Online (Razorpay)</div>
                <div className="text-xs text-stone-500">UPI, Cards, NetBanking & Wallets.</div>
              </div>
            </label>
          </RadioGroup>
        </section>
      </form>

      <aside className="md:col-span-1">
        <div className="sticky top-24 soft-panel p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Order summary</h2>
          <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-800 flex items-center gap-2">
            <Bike size={15} />
            {deliveryFee === 0 ? "Free delivery applied" : `${formatMoney(deliveryFee)} delivery fee`}
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map(i => (
              <div key={i.dish_id} className="flex items-center gap-3 text-sm">
                {i.image_url && <img src={i.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{i.name}</div>
                  <div className="text-xs text-stone-500">x {i.qty}</div>
                </div>
                <div className="font-medium">{formatMoney(i.price * i.qty, { noPaise: true })}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-stone-200 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{formatMoney(discount)}</span></div>}
            <div className="flex justify-between text-stone-600"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : formatMoney(deliveryFee)}</span></div>
            <div className="flex justify-between text-stone-600"><span>Tax</span><span>{formatMoney(payableTax)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200">
              <span>Total</span><span data-testid="checkout-total">{formatMoney(payableTotal)}</span>
            </div>
          </div>
          <Button onClick={submit} disabled={placing}
            className="w-full mt-5 h-11 rounded-full bg-orange-600 hover:bg-orange-700" data-testid="place-order-btn">
            {placing ? "Placing..." : `Place order - ${formatMoney(payableTotal)}`}
          </Button>
        </div>
      </aside>
    </div>
  );
}
