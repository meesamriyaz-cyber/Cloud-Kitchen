import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2, Printer, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, shortOrderId } from "@/lib/format";
import { printReceipt, printReceiptByOrder } from "@/lib/receipt";

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
      .then(r => {
        const loaded = r.data;
        setOrder(loaded);
        setTimeout(() => {
          printReceiptByOrder(loaded.id).catch(() => {});
        }, 800);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const printInvoice = () => {
    setPrinting(true);
    printReceiptByOrder(orderId)
      .then(() => setPrinting(false))
      .catch(() => setPrinting(false));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-stone-600 dark:text-stone-400">Verifying payment...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <ShoppingBag size={28} className="text-stone-400 dark:text-stone-500" />
        </div>
        <p className="text-stone-600 dark:text-stone-400">Order not found.</p>
        <Button className="mt-4 rounded-full bg-primary hover:opacity-95" onClick={() => navigate("/menu")}>
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16 text-center">
      <div className="relative inline-block">
        <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
          <div className="absolute inset-0 rounded-full bg-green-400/30 dark:bg-green-400/20 animate-ping opacity-40" />
          <CheckCircle2 size={40} className="text-green-600 dark:text-green-400 relative z-10" />
        </div>
      </div>
      <h1 className="font-display text-4xl font-bold mt-8 tracking-tight text-stone-950 dark:text-stone-100">
        Payment Successful!
      </h1>
      <p className="text-stone-600 dark:text-stone-400 mt-3 max-w-md mx-auto">
        Your order <span className="font-mono font-semibold text-stone-900 dark:text-stone-200">#{shortOrderId(order)}</span> has been placed and confirmed.
      </p>
      <div className="mt-2 text-stone-500 dark:text-stone-400 text-sm">
        Amount paid: <span className="font-semibold text-stone-900 dark:text-stone-200">{formatMoney(order.total)}</span>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
         <Button variant="outline" className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" onClick={printInvoice} disabled={printing}>
           <Printer size={16} className="mr-2" />
           {printing ? "Printing..." : "Print Receipt"}
         </Button>
        <Button className="rounded-full bg-primary hover:opacity-95" onClick={() => navigate(`/orders/${order.id}`)}>
          Track Order <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
