import React from "react";
import { Flame, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/format";

export default function DishCard({ dish }) {
  const { addItem } = useCart();
  const unavailable = dish.is_available === false;

  const handleAdd = () => {
    if (unavailable) {
      toast.error(`${dish.name} is currently sold out`);
      return;
    }
    addItem(dish);
    toast.success(`${dish.name} added to cart`);
  };

  const spiceTone = dish.spice_level === "hot"
    ? "text-red-700 bg-red-50"
    : dish.spice_level === "mild"
      ? "text-orange-700 bg-orange-50"
      : "text-amber-700 bg-amber-50";

  return (
    <motion.div
      layout
      whileHover={{ y: unavailable ? 0 : -3 }}
      whileTap={{ scale: unavailable ? 1 : 0.985 }}
      className={`dish-card group bg-white border border-stone-200/80 overflow-hidden flex flex-col ${unavailable ? "opacity-60" : ""}`}
      data-testid={`dish-card-${dish.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 font-display font-semibold">
            Mukhtar
          </div>
        )}
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
            <span className={dish.veg ? "veg-dot" : "nonveg-dot"} title={dish.veg ? "Veg" : "Non-Veg"} />
            {dish.veg ? "Veg" : "Non-veg"}
          </span>
          {unavailable ? (
            <span className="rounded-full bg-orange-600 text-white text-[11px] font-semibold px-3 py-1 shadow-sm">
              Sold out
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${spiceTone}`}>
              <Flame size={12} />
              {dish.spice_level || "medium"}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-display font-semibold text-base tracking-tight leading-snug">{dish.name}</h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{dish.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-lg font-bold text-stone-900">{formatMoney(dish.price, { noPaise: true })}</div>
          <button
            onClick={handleAdd}
            disabled={unavailable}
            className="rounded-full bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-4 h-9 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
            data-testid={`add-to-cart-${dish.id}`}
          >
            <Plus size={14} /> {unavailable ? "Sold out" : "Add"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
