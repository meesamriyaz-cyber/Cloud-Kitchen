import React, { createContext, useContext, useEffect, useState } from "react";

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mck_cart") || "[]"); }
    catch { return []; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { localStorage.setItem("mck_cart", JSON.stringify(items)); }, [items]);

  const addItem = (dish, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find(i => i.dish_id === dish.id);
      if (existing) {
        return prev.map(i => i.dish_id === dish.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { dish_id: dish.id, name: dish.name, price: dish.price, qty, image_url: dish.image_url }];
    });
  };

  const updateQty = (dish_id, qty) => {
    setItems((prev) => qty <= 0
      ? prev.filter(i => i.dish_id !== dish_id)
      : prev.map(i => i.dish_id === dish_id ? { ...i, qty } : i)
    );
  };

  const removeItem = (dish_id) => setItems((prev) => prev.filter(i => i.dish_id !== dish_id));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = subtotal >= 499 || subtotal === 0 ? 0 : 39;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, open, setOpen, addItem, updateQty, removeItem, clear, subtotal, deliveryFee, tax, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
