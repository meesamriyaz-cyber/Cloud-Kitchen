import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, shortOrderId } from "@/lib/format";
import { generateReceiptHTML, printReceipt } from "@/lib/receipt";
import { FIRM } from "@/constants/firm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function orderTypeLabel(type) {
  const labels = { takeaway: "Takeaway", dine_in: "Dine-in", delivery: "Delivery" };
  return labels[type] || "Takeaway";
}

function paymentLabel(method) {
  const labels = { cash: "Cash", upi: "UPI", card: "Card", cod: "Cash on Delivery", razorpay: "Online" };
  return labels[method] || method || "Cash";
}

export default function ReceiptPrint() {
  const { oid } = useParams();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("auto") === "1";
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("mck_token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    axios
      .get(`${API}/orders/${oid}/invoice`, { withCredentials: true })
      .then((r) => {
        setInvoice(r.data);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load invoice");
      })
      .finally(() => setLoading(false));
  }, [oid]);

  useEffect(() => {
    if (invoice && autoPrint) {
      const timer = setTimeout(() => {
        printReceipt(invoice);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [invoice, autoPrint]);

  const handlePrint = () => {
    if (invoice) {
      printReceipt(invoice);
    }
  };

  const openPopUp = () => {
    if (!invoice) return;
    const html = generateReceiptHTML(invoice);
    const popup = window.open("", "mukhtar-receipt-print", "width=420,height=720,scrollbars=yes");
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
  };

  const printSection = () => {
    const el = document.getElementById("receipt-preview");
    if (el) {
      const w = window.open("", "_blank", "width=420,height=720");
      if (w) {
        w.document.write(`
          <html>
          <head>
            <title>Receipt #${shortOrderId(invoice)}</title>
            <style>
              @page { size: 58mm auto; margin: 0; }
              body { margin: 0; padding: 2mm; font-family: Arial, sans-serif; font-size: 11px; color: #000; }
            </style>
          </head>
          <body>${el.innerHTML}</body>
          </html>
        `);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary"></div>
        <p className="text-stone-600 dark:text-stone-400">Loading receipt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" className="rounded-full" onClick={() => window.history.back()}>
          <ArrowRight size={16} className="mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <p className="text-stone-600 dark:text-stone-400">Invoice not found.</p>
        <Button variant="outline" className="rounded-full" onClick={() => window.history.back()}>
          <ArrowRight size={16} className="mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const firm = invoice.firm || FIRM;
  const orderNo = shortOrderId(invoice);
  const customer = invoice.customer || "Walk-in";
  const phone = invoice.phone || invoice.address?.phone || "";
  const date = new Date(invoice.created_at).toLocaleString();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; padding: 0; }
          .print-wrapper { width: 56mm; margin: 0; padding: 2mm; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 py-8">
        <div className="max-w-xs mx-auto">
          <div className="flex justify-end gap-2 mb-4 no-print">
            <Button variant="outline" size="sm" className="rounded-full" onClick={openPopUp}>
              <Printer size={14} className="mr-1" /> Pop-up Print
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handlePrint}>
              <Printer size={14} className="mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.history.back()}>
              <ArrowRight size={14} className="mr-2 rotate-180" /> Back
            </Button>
          </div>

          <div
            id="receipt-preview"
            className="bg-white mx-auto shadow-lg print:shadow-none print:bg-white print-wrapper"
            style={{
              width: "56mm",
              maxWidth: "100%",
              padding: "2mm",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "11px",
              lineHeight: "1.4",
              color: "#000",
            }}
          >
            {/* Row 1: Firm name and address */}
            <div className="text-center mb-1">
              <div className="font-bold text-base mb-0.5">{firm.name}</div>
              <div className="text-[8px] text-stone-600 dark:text-stone-400 leading-tight">
                {firm.address}
                <br />
                {firm.city}
                <br />
                {firm.state}
                <br />
                Ph: {firm.phone} | GST: {firm.gst}
              </div>
            </div>

            <div className="border-t border-dashed border-stone-300 dark:border-stone-600 my-1"></div>

            {/* Row 2: Bill details */}
            <div className="text-[8px] my-1 border-t border-dashed border-stone-300 dark:border-stone-600 border-b pb-1">
              <div className="font-bold text-center text-xs my-1">SALE RECEIPT</div>
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <span>#{orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{date}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{customer}</span>
              </div>
              {phone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Order Type:</span>
                <span>{orderTypeLabel(invoice.order_type)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span>{paymentLabel(invoice.payment_method)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={invoice.payment_status === "paid" ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                  {invoice.payment_status === "paid" ? "PAID" : "PENDING"}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-stone-300 dark:border-stone-600 my-1"></div>

            {/* Items */}
            <div className="my-1">
              <div className="flex justify-between text-[7px] font-bold mb-0.5">
                <span className="flex-1">Item</span>
                <span className="w-8 text-right">Qty</span>
                <span className="w-14 text-right">Total</span>
              </div>
              {invoice.items.map((item, idx) => {
                const name = item.name.length > 25 ? item.name.slice(0, 22) + "..." : item.name;
                return (
                  <div
                    key={idx}
                    className="flex justify-between border-t border-dotted border-stone-200 dark:border-stone-700 py-0.5"
                  >
                    <span className="flex-1 break-words">{name}</span>
                    <span className="w-8 text-right">{item.qty}x</span>
                    <span className="w-14 text-right">
                      {formatMoney(item.price * item.qty, { noPaise: true })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-stone-300 dark:border-stone-600 my-1"></div>

            {/* Totals */}
            <div className="text-[8px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotal, { noPaise: true })}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>
                    {invoice.coupon_code ? `Coupon (${invoice.coupon_code})` : "Discount"}
                  </span>
                  <span>
                    -{formatMoney(invoice.discount, { noPaise: true })}
                  </span>
                </div>
              )}
              {invoice.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{formatMoney(invoice.delivery_fee, { noPaise: true })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatMoney(invoice.tax, { noPaise: true })}</span>
              </div>
              <div className="border-t border-solid border-stone-600 dark:border-stone-400 my-1"></div>
              <div className="flex justify-between font-bold text-sm pt-0.5">
                <span>TOTAL</span>
                <span>Rs. {formatMoney(invoice.total, { noPaise: true })}</span>
              </div>
            </div>

            <div className="border-t border-solid border-stone-600 dark:border-stone-400 my-2"></div>

            {/* Footer: Thank you for visiting firm name */}
            <div className="text-center text-xs font-bold mt-2">
              Thank you for visiting
              <br />
              {firm.name}
            </div>
            <div className="text-center text-[7px] text-stone-500 dark:text-stone-400 mt-0.5">
              {firm.tagline}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
