import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, shortOrderId } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Invoice() {
  const { oid } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/orders/${oid}/invoice`)
      .then(r => setInvoice(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [oid]);

  const print = () => window.print();

  if (loading) {
    return <div className="max-w-3xl mx-auto px-5 py-10">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 text-center">
        <p className="text-stone-600">Invoice not found.</p>
        <Button className="mt-4 rounded-full bg-orange-600 hover:bg-orange-700" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Invoice</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => window.history.back()}>
            <ArrowRight size={16} className="mr-2" /> Back
          </Button>
          <Button className="rounded-full bg-orange-600 hover:bg-orange-700" onClick={print}>
            <Printer size={16} className="mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="soft-panel p-8 space-y-6" id="invoice-area">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Mukhtar Cloud Kitchen</h2>
            <p className="text-stone-500 text-sm mt-1">Invoice #{shortOrderId(invoice)}</p>
            <p className="text-stone-500 text-sm">{new Date(invoice.created_at).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500">Order Type</div>
            <div className="font-semibold capitalize">{invoice.order_type?.replace('_', ' ') || 'Delivery'}</div>
            {invoice.table_no && (
              <>
                <div className="text-xs text-stone-500 mt-2">Table No.</div>
                <div className="font-semibold">{invoice.table_no}</div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider">Bill To</div>
            <div className="font-semibold mt-1">{invoice.customer}</div>
            {invoice.address?.phone && <div className="text-sm text-stone-600">{invoice.address.phone}</div>}
            {invoice.address?.line1 && <div className="text-sm text-stone-600">{invoice.address.line1}</div>}
            {invoice.address?.city && <div className="text-sm text-stone-600">{invoice.address.city}</div>}
            {invoice.address?.pincode && <div className="text-sm text-stone-600">{invoice.address.pincode}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 uppercase tracking-wider">Payment</div>
            <div className="font-semibold mt-1 capitalize">{invoice.payment_method}</div>
            <div className={`text-sm font-medium ${invoice.payment_status === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
              {invoice.payment_status === 'paid' ? 'Paid' : 'Pending'}
            </div>
            {invoice.razorpay_payment_id && (
              <div className="text-xs text-stone-500 mt-1">ID: {invoice.razorpay_payment_id}</div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2 font-medium text-stone-600">Item</th>
                <th className="text-center py-2 font-medium text-stone-600">Qty</th>
                <th className="text-right py-2 font-medium text-stone-600">Price</th>
                <th className="text-right py-2 font-medium text-stone-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-stone-100">
                  <td className="py-2">{item.name}</td>
                  <td className="text-center py-2">{item.qty}</td>
                  <td className="text-right py-2">{formatMoney(item.price)}</td>
                  <td className="text-right py-2">{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-stone-200 space-y-2 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>{formatMoney(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatMoney(invoice.discount)}</span>
            </div>
          )}
          {invoice.coupon_code && (
            <div className="flex justify-between text-stone-500">
              <span>Coupon</span>
              <span>{invoice.coupon_code}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-600">
            <span>Delivery</span>
            <span>{invoice.delivery_fee === 0 ? 'Free' : formatMoney(invoice.delivery_fee)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Tax</span>
            <span>{formatMoney(invoice.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200">
            <span>Total</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
        </div>

        <div className="pt-6 text-center text-xs text-stone-400">
          Thank you for ordering with Mukhtar Cloud Kitchen!
        </div>
      </div>
    </div>
  );
}
