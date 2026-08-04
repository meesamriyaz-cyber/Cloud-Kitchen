import React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

export default function DishCard({ dish }) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(dish);
    toast.success(`${dish.name} added to cart`);
  };

  return (
    <div className="dish-card group rounded-2xl bg-white border border-stone-200/70 overflow-hidden flex flex-col" data-testid={`dish-card-${dish.id}`}>
      {dish.image_url && (
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <img src={dish.image_url} alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-3 left-3">
            <span className={dish.veg ? "veg-dot" : "nonveg-dot"} title={dish.veg ? "Veg" : "Non-Veg"} />
          </div>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-display font-semibold text-base tracking-tight leading-snug">{dish.name}</h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{dish.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-lg font-bold text-stone-900">₹{dish.price}</div>
          <button
            onClick={handleAdd}
            className="rounded-full bg-[#E76F51] hover:bg-[#D85C3E] text-white px-4 h-9 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
            data-testid={`add-to-cart-${dish.id}`}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
