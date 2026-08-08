import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2, Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    axios.get(`${API}/orders/${orderId}`)
      .then(r => setOrder(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const printInvoice = () => {
    setPrinting(true);
    const url = `/orders/${orderId}/invoice`;
    const win = window.open(url, "_blank", "width=800,height=900");
    if (win) {
      win.onload = () => { win.print(); setPrinting(false); };
    } else {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-700" />
        <p className="mt-4 text-stone-600">Verifying payment...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <p className="text-stone-600">Order not found.</p>
        <Button className="mt-4 rounded-full bg-orange-600 hover:bg-orange-700" onClick={() => navigate("/menu")}>
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16 text-center">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 size={32} className="text-green-600" />
      </div>
      <h1 className="font-display text-3xl font-bold mt-6">Payment Successful!</h1>
      <p className="text-stone-600 mt-2">Your order <span className="font-mono font-semibold">#{shortOrderId(order)}</span> has been placed.</p>
      <p className="text-stone-500 text-sm mt-1">Amount paid: {formatMoney(order.total)}</p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="outline" className="rounded-full" onClick={printInvoice} disabled={printing}>
          <Printer size={16} className="mr-2" />
          {printing ? "Opening..." : "Print Invoice"}
        </Button>
        <Button className="rounded-full bg-orange-600 hover:bg-orange-700" onClick={() => navigate(`/orders/${order.id}`)}>
          Track Order <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
