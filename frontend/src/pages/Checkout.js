import React, { useState } from "react";
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
  const { items, subtotal, deliveryFee, tax, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addr, setAddr] = useState({
    full_name: user?.name || "", phone: "", line1: "", city: "", pincode: "", notes: ""
  });
  const [method, setMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Your cart is empty</h2>
        <Button className="mt-4 rounded-full bg-[#E76F51] hover:bg-[#D85C3E]" onClick={() => navigate("/menu")}>Browse Menu</Button>
      </div>
    );
  }

  const placeOrder = async (razorpayData = {}) => {
    const res = await axios.post(`${API}/orders`, {
      items, address: addr, payment_method: method, ...razorpayData
    });
    clear();
    toast.success("Order placed successfully!");
    navigate(`/orders/${res.data.id}`);
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
        const order = await axios.post(`${API}/payments/razorpay/order`, { amount: total });
        const options = {
          key: cfg.data.key_id,
          amount: order.data.amount,
          currency: order.data.currency,
          order_id: order.data.id,
          name: "Mukhtar Cloud Kitchen",
          description: "Food order",
          prefill: { name: addr.full_name, email: user?.email, contact: addr.phone },
          theme: { color: "#E76F51" },
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
    <div className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-3 gap-8">
      <form onSubmit={submit} className="md:col-span-2 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-stone-500 text-sm mt-1">Just a few details to get cooking.</p>
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Delivery details</h2>
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

        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Payment</h2>
          <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 has-[:checked]:border-[#E76F51] has-[:checked]:bg-orange-50/40 cursor-pointer">
              <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
              <div className="flex-1">
                <div className="font-medium text-sm">Cash on Delivery</div>
                <div className="text-xs text-stone-500">Pay when your food arrives.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 has-[:checked]:border-[#E76F51] has-[:checked]:bg-orange-50/40 cursor-pointer">
              <RadioGroupItem value="razorpay" id="rzp" data-testid="payment-razorpay" />
              <div className="flex-1">
                <div className="font-medium text-sm">Pay Online (Razorpay)</div>
                <div className="text-xs text-stone-500">UPI, Cards, NetBanking & Wallets.</div>
              </div>
            </label>
          </RadioGroup>
        </section>
      </form>

      <aside className="md:col-span-1">
        <div className="sticky top-24 bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Order summary</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map(i => (
              <div key={i.dish_id} className="flex items-center gap-3 text-sm">
                {i.image_url && <img src={i.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{i.name}</div>
                  <div className="text-xs text-stone-500">× {i.qty}</div>
                </div>
                <div className="font-medium">₹{(i.price * i.qty).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-stone-200 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-stone-600"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span></div>
            <div className="flex justify-between text-stone-600"><span>Tax</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200">
              <span>Total</span><span data-testid="checkout-total">₹{total.toFixed(2)}</span>
            </div>
          </div>
          <Button onClick={submit} disabled={placing}
            className="w-full mt-5 h-11 rounded-full bg-[#E76F51] hover:bg-[#D85C3E]" data-testid="place-order-btn">
            {placing ? "Placing..." : `Place order · ₹${total.toFixed(2)}`}
          </Button>
        </div>
      </aside>
    </div>
  );
}
