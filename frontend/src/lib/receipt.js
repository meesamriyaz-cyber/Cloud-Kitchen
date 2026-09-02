import axios from "axios";
import { FIRM } from "@/constants/firm";
import { formatMoney, shortOrderId, orderCustomer } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function orderTypeLabel(type) {
  const labels = { takeaway: "Takeaway", dine_in: "Dine-in", delivery: "Delivery" };
  return labels[type] || "Takeaway";
}

function paymentLabel(method) {
  const labels = { cash: "Cash", upi: "UPI", card: "Card", cod: "Cash on Delivery", razorpay: "Online" };
  return labels[method] || method || "Cash";
}

export function generateReceiptHTML(invoice) {
  const firm = invoice?.firm || FIRM;
  const orderNo = shortOrderId(invoice);
  const customer = invoice?.customer || orderCustomer(invoice);
  const phone = invoice?.phone || invoice?.address?.phone || invoice?.pos_customer_phone || "";
  const date = new Date(invoice.created_at).toLocaleString();

  const itemRows = (invoice.items || []).map((item) => {
    const lineTotal = formatMoney(item.price * item.qty, { noPaise: true });
    const name = escapeHtml(item.name);
    const nameCell = name.length > 30 ? name.slice(0, 27) + "..." : name;
    return `
      <tr class="item-row">
        <td class="item-name">${nameCell}</td>
        <td class="item-qty">${item.qty}x</td>
        <td class="item-price">${escapeHtml(lineTotal)}</td>
      </tr>`;
  }).join("");

  const hasDiscount = invoice.discount > 0;
  const hasCoupon = invoice.coupon_code;
  const hasDelivery = invoice.delivery_fee > 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt #${escapeHtml(orderNo)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 58mm auto; margin: 0; }
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    width: 56mm;
    padding: 2mm;
    overflow: hidden;
  }
  @media print {
    body { width: 56mm; padding: 0; }
    .no-print { display: none !important; }
  }
  .receipt { width: 100%; }

  /* Row 1: Firm name and address */
  .firm-header { text-align: center; margin-bottom: 4px; }
  .firm-name { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
  .firm-address { font-size: 9px; color: #333; line-height: 1.3; }

  /* Row 2: Bill details */
  .bill-details { margin: 4px 0; border-top: 1px dashed #666; border-bottom: 1px dashed #666; padding: 4px 0; font-size: 9px; line-height: 1.4; }
  .bill-details .row { display: flex; justify-content: space-between; }
  .bill-details .row.full { flex-direction: column; }
  .bill-details .row.full .label { font-weight: 700; }

  /* Bill title */
  .bill-title { text-align: center; font-size: 12px; font-weight: 700; margin: 4px 0; }

  /* Items */
  .items { margin: 6px 0; }
  .item-row { display: flex; }
  .item-name { flex: 1; word-break: break-word; }
  .item-qty { width: 30px; text-align: right; }
  .item-price { width: 55px; text-align: right; }
  .item-row + .item-row { border-top: 1px dotted #ccc; }

  /* Totals */
  .totals { margin-top: 6px; font-size: 9px; }
  .total-row { display: flex; justify-content: space-between; }
  .total-row.grand { font-size: 12px; font-weight: 700; border-top: 1px solid #000; margin-top: 3px; padding-top: 3px; }

  /* Separator */
  .separator-dashed { border-top: 1px dashed #999; margin: 6px 0; }
  .separator-solid { border-top: 1px solid #000; margin: 6px 0; }

  /* Footer */
  .footer { text-align: center; margin-top: 8px; font-size: 10px; font-weight: 700; }
  .footer-tagline { font-size: 8px; font-weight: normal; margin-top: 2px; color: #555; }
</style>
</head>
<body>
  <div class="receipt">

    <!-- Row 1: Firm name and address -->
    <div class="firm-header">
      <div class="firm-name">${escapeHtml(firm.name)}</div>
      <div class="firm-address">
        ${escapeHtml(firm.address)}<br>
        ${escapeHtml(firm.city)}<br>
        ${escapeHtml(firm.state)}<br>
        Ph: ${escapeHtml(firm.phone)} | GST: ${escapeHtml(firm.gst)}
      </div>
    </div>

    <div class="separator-dashed"></div>

    <!-- Row 2: Bill details -->
    <div class="bill-details">
      <div class="bill-title">SALE RECEIPT</div>
      <div class="row"><span>Invoice No:</span><span>#${escapeHtml(orderNo)}</span></div>
      <div class="row"><span>Date:</span><span>${escapeHtml(date)}</span></div>
      <div class="row"><span>Customer:</span><span>${escapeHtml(customer)}</span></div>
      ${phone ? `<div class="row"><span>Phone:</span><span>${escapeHtml(phone)}</span></div>` : ""}
      <div class="row"><span>Order Type:</span><span>${escapeHtml(orderTypeLabel(invoice.order_type))}</span></div>
      <div class="row"><span>Payment:</span><span>${escapeHtml(paymentLabel(invoice.payment_method))}</span></div>
      <div class="row"><span>Status:</span><span>${escapeHtml(invoice.payment_status === 'paid' ? 'PAID' : 'PENDING')}</span></div>
    </div>

    <div class="separator-dashed"></div>

    <!-- Items -->
    <div class="items">
      <div class="item-row" style="font-weight:700; font-size:8px;">
        <td class="item-name">Item</td>
        <td class="item-qty">Qty</td>
        <td class="item-price">Total</td>
      </div>
      ${itemRows}
    </div>

    <div class="separator-dashed"></div>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${formatMoney(invoice.subtotal, { noPaise: true })}</span></div>
      ${hasCoupon ? `<div class="total-row"><span>Coupon (${escapeHtml(invoice.coupon_code)})</span><span>-${formatMoney(invoice.discount, { noPaise: true })}</span></div>` : ""}
      ${hasDiscount && !hasCoupon ? `<div class="total-row"><span>Discount</span><span>-${formatMoney(invoice.discount, { noPaise: true })}</span></div>` : ""}
      ${hasDelivery ? `<div class="total-row"><span>Delivery</span><span>${formatMoney(invoice.delivery_fee, { noPaise: true })}</span></div>` : ""}
      <div class="total-row"><span>Tax</span><span>${formatMoney(invoice.tax, { noPaise: true })}</span></div>
      <div class="separator-solid"></div>
      <div class="total-row grand"><span>TOTAL</span><span>${formatMoney(invoice.total, { noPaise: true })}</span></div>
    </div>

    <div class="separator-solid"></div>

    <!-- Footer -->
    <div class="footer">
      Thank you for visiting<br>
      ${escapeHtml(firm.name)}
    </div>
    <div class="footer-tagline">${escapeHtml(firm.tagline)}</div>

  </div>
</body>
</html>`;
}

export function printReceipt(invoice) {
  try {
    const html = generateReceiptHTML(invoice);
    const popup = window.open("", "restaurant-receipt-print", "width=420,height=720,scrollbars=yes");
    if (!popup) {
      console.error("[receipt] popup blocked");
      return false;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
    return true;
  } catch (err) {
    console.error("[receipt] print failed", err);
    return false;
  }
}

export async function printReceiptByOrder(orderId) {
  const token = localStorage.getItem("restaurant_app_token");
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  const res = await axios.get(`${API}/orders/${orderId}/invoice`, { withCredentials: true });
  return printReceipt(res.data);
}
