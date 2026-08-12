import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { XCircle, Loader2, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
        <p className="text-stone-600 dark:text-stone-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16 text-center">
      <div className="relative inline-block">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
          <XCircle size={40} className="text-red-600 dark:text-red-400" />
        </div>
      </div>
      <h1 className="font-display text-4xl font-bold mt-8 tracking-tight text-stone-950 dark:text-stone-100">
        Payment Failed
      </h1>
      <p className="text-stone-600 dark:text-stone-400 mt-3">
        {order
          ? <>Your order <span className="font-mono font-semibold text-stone-900 dark:text-stone-200">#{shortOrderId(order)}</span> could not be completed.</>
          : "We could not process your payment."}
      </p>
      {order && (
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          Amount: {formatMoney(order.total)}
        </p>
      )}

      {order ? (
        <div className="mt-8 bg-stone-50 dark:bg-stone-800/40 rounded-xl p-4 text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
          <p>Don't worry — you can retry with a different payment method or choose cash on delivery.</p>
        </div>
      ) : (
        <div className="mt-4 text-stone-500 dark:text-stone-400">
          <ShoppingBag size={24} className="mx-auto" />
        </div>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="outline" className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" onClick={() => navigate("/menu")}>
          Continue Shopping
        </Button>
        {order && (
          <Button className="rounded-full bg-primary hover:opacity-95" onClick={() => navigate(`/checkout`)}>
            Try Again <ArrowRight size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
