import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { ArrowRight, Bike, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "@/lib/format";

export default function CartSheet() {
  const { items, open, setOpen, updateQty, removeItem, subtotal, deliveryFee, tax, total } = useCart();
  const navigate = useNavigate();
  const remainingForFreeDelivery = Math.max(0, 499 - subtotal);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#fbfaf6] border-l border-stone-200">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your Cart</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
              <ShoppingBag className="text-stone-400" />
            </div>
            <p className="text-stone-500">Your cart is empty</p>
            <Button onClick={() => { setOpen(false); navigate("/menu"); }} className="rounded-full bg-orange-600 hover:bg-orange-700" data-testid="cart-browse-menu-btn">
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col h-[calc(100vh-140px)]">
            <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
              <Bike size={15} />
              {remainingForFreeDelivery > 0 ? `${formatMoney(remainingForFreeDelivery, { noPaise: true })} away from free delivery` : "Free delivery unlocked"}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {items.map(it => (
                <div key={it.dish_id} className="flex gap-3 p-3 rounded-lg bg-white border border-stone-200" data-testid={`cart-item-${it.dish_id}`}>
                  {it.image_url && <img src={it.image_url} alt={it.name} className="w-16 h-16 rounded-xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{it.name}</div>
                    <div className="text-emerald-700 font-semibold text-sm">{formatMoney(it.price, { noPaise: true })}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQty(it.dish_id, it.qty - 1)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200" data-testid={`cart-decr-${it.dish_id}`}><Minus size={12} /></button>
                      <span className="text-sm w-6 text-center font-medium">{it.qty}</span>
                      <button onClick={() => updateQty(it.dish_id, it.qty + 1)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200" data-testid={`cart-incr-${it.dish_id}`}><Plus size={12} /></button>
                      <button onClick={() => removeItem(it.dish_id)} className="ml-auto text-stone-400 hover:text-red-500" data-testid={`cart-remove-${it.dish_id}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
              <div className="flex justify-between text-stone-600"><span>Subtotal</span><span data-testid="cart-subtotal">{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between text-stone-600"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : formatMoney(deliveryFee)}</span></div>
              <div className="flex justify-between text-stone-600"><span>Tax (5%)</span><span>{formatMoney(tax)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-stone-200">
                <span>Total</span><span data-testid="cart-total">{formatMoney(total)}</span>
              </div>
              <Button onClick={() => { setOpen(false); navigate("/checkout"); }}
                className="w-full rounded-full bg-orange-600 hover:bg-orange-700 mt-3 h-11"
                data-testid="cart-checkout-btn">
                Proceed to Checkout <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
