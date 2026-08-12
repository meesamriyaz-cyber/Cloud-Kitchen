import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import DishCard from "@/components/DishCard";
import { ArrowRight, Leaf, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApiUnavailable from "@/components/ApiUnavailable";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Menu() {
  const [cats, setCats] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vegFilter, setVegFilter] = useState("all");
  const [spiceFilter, setSpiceFilter] = useState("all");
  const [sort, setSort] = useState("recommended");
  const loc = useLocation();
  const initialCat = new URLSearchParams(loc.search).get("cat") || "all";
  const [activeCat, setActiveCat] = useState(initialCat);
  const { count, total, setOpen } = useCart();

  const loadMenu = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [catRes, dishRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/dishes`),
      ]);
      setCats(catRes.data);
      setDishes(dishRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load menu right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = dishes.filter(d => {
      if (activeCat !== "all" && d.category_id !== activeCat) return false;
      if (vegFilter === "veg" && !d.veg) return false;
      if (vegFilter === "nonveg" && d.veg) return false;
      if (spiceFilter !== "all" && d.spice_level !== spiceFilter) return false;
      if (term && !`${d.name} ${d.description || ""}`.toLowerCase().includes(term)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "available") return Number(b.is_available !== false) - Number(a.is_available !== false);
      return Number(b.is_available !== false) - Number(a.is_available !== false) || a.name.localeCompare(b.name);
    });
  }, [dishes, activeCat, q, sort, spiceFilter, vegFilter]);

  const activeCatName = activeCat === "all" ? "All dishes" : cats.find(cat => cat.id === activeCat)?.name || "Selected category";

  return (
    <div className="max-w-7xl mx-auto px-5 pt-8 pb-24">
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-stretch mb-6">
        <div className="soft-panel p-5 md:p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
            <Leaf size={13} /> Live menu
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 dark:text-stone-100">Order online from Mukhtar</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm md:text-base mt-2 max-w-2xl">
            Filter by craving, spice, and dietary preference. Sold-out items stay visible so staff and customers share the same kitchen reality.
          </p>
        </div>
        <div className="soft-panel p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Cart summary</div>
              <div className="text-xs text-stone-500 dark:text-stone-400">{count} item{count !== 1 && "s"} selected</div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase text-stone-500 dark:text-stone-400">Payable</div>
              <div className="font-display text-2xl font-bold dark:text-stone-200">{formatMoney(total, { noPaise: true })}</div>
            </div>
            <Button
              className="rounded-full bg-primary hover:opacity-95"
              disabled={count === 0}
              onClick={() => setOpen(true)}
            >
              Review
            </Button>
          </div>
        </div>
      </div>

      <div className="soft-panel p-4 mb-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_190px]">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search biryani, curry, tandoor..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 rounded-full h-11 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200"
              data-testid="menu-search-input"
            />
          </div>
          <Select value={vegFilter} onValueChange={setVegFilter}>
            <SelectTrigger className="rounded-full h-11 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="menu-diet-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="veg">Veg only</SelectItem>
              <SelectItem value="nonveg">Non-veg</SelectItem>
            </SelectContent>
          </Select>
          <Select value={spiceFilter} onValueChange={setSpiceFilter}>
            <SelectTrigger className="rounded-full h-11 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="menu-spice-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All spice</SelectItem>
              <SelectItem value="mild">Mild</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="rounded-full h-11 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="menu-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="available">Available first</SelectItem>
              <SelectItem value="price_asc">Price low to high</SelectItem>
              <SelectItem value="price_desc">Price high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
           <button
             onClick={() => setActiveCat("all")}
            className={`shrink-0 px-4 h-10 rounded-full text-sm font-semibold transition-colors ${activeCat === "all" ? "bg-primary text-white border-primary" : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"}`}
           >
             All
           </button>
         {cats.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
             className={`shrink-0 px-4 h-10 rounded-full text-sm font-semibold transition-colors ${activeCat === c.id ? "bg-primary text-white border-primary" : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-xs uppercase text-stone-500 dark:text-stone-400 inline-flex items-center gap-2">
            <SlidersHorizontal size={13} /> {activeCatName}
          </div>
          <h2 className="font-display text-2xl font-bold mt-1 dark:text-stone-100">{filtered.length} dishes ready to cook</h2>
        </div>
      </div>

      {error ? (
        <ApiUnavailable message={error} onRetry={loadMenu} />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
             <div key={index} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-hidden animate-pulse">
               <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-700" />
               <div className="p-4 space-y-3">
                 <div className="h-4 bg-stone-100 dark:bg-stone-700 rounded" />
                 <div className="h-3 bg-stone-100 dark:bg-stone-700 rounded w-2/3" />
                 <div className="h-9 bg-stone-100 dark:bg-stone-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="soft-panel text-center py-16 text-stone-500 dark:text-stone-400">
          No dishes match those filters. Try another category or clear the search.
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(d => <DishCard key={d.id} dish={d} />)}
        </motion.div>
      )}

      {count > 0 && (
        <div className="fixed left-4 right-4 bottom-4 z-30 md:hidden">
          <div className="bg-stone-950 text-white shadow-2xl rounded-full px-4 py-3 flex items-center justify-between gap-3">
            <button className="flex items-center gap-3 text-left" onClick={() => setOpen(true)}>
              <ShoppingBag size={18} />
              <span className="text-sm font-semibold">{count} items - {formatMoney(total, { noPaise: true })}</span>
            </button>
            <Link to="/checkout" className="text-sm font-semibold inline-flex items-center gap-1">
              Checkout <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
