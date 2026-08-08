import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { XCircle, Loader2, ArrowRight } from "lucide-react";
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
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-700" />
        <p className="mt-4 text-stone-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16 text-center">
      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
        <XCircle size={32} className="text-red-600" />
      </div>
      <h1 className="font-display text-3xl font-bold mt-6">Payment Failed</h1>
      <p className="text-stone-600 mt-2">
        {order
          ? <>Your order <span className="font-mono font-semibold">#{shortOrderId(order)}</span> could not be completed.</>
          : "We could not process your payment."}
      </p>
      {order && (
        <p className="text-stone-500 text-sm mt-1">Amount: {formatMoney(order.total)}</p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="outline" className="rounded-full" onClick={() => navigate("/menu")}>
          Continue Shopping
        </Button>
        {order && (
          <Button className="rounded-full bg-orange-600 hover:bg-orange-700" onClick={() => navigate(`/checkout`)}>
            Try Again <ArrowRight size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
