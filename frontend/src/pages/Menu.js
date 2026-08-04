import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import DishCard from "@/components/DishCard";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Menu() {
  const [cats, setCats] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [q, setQ] = useState("");
  const loc = useLocation();
  const initialCat = new URLSearchParams(loc.search).get("cat") || "all";
  const [activeCat, setActiveCat] = useState(initialCat);

  useEffect(() => {
    axios.get(`${API}/categories`).then(r => setCats(r.data));
    axios.get(`${API}/dishes`).then(r => setDishes(r.data));
  }, []);

  const filtered = useMemo(() => {
    return dishes.filter(d => {
      if (activeCat !== "all" && d.category_id !== activeCat) return false;
      if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [dishes, activeCat, q]);

  return (
    <div className="max-w-7xl mx-auto px-5 pt-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Our Menu</h1>
          <p className="text-stone-500 text-sm mt-1">{filtered.length} dishes ready to cook</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search dishes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 rounded-full h-11 bg-white border-stone-200"
            data-testid="menu-search-input"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
        <button onClick={() => setActiveCat("all")}
          className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium transition-colors ${activeCat === "all" ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"}`}
          data-testid="cat-filter-all">All</button>
        {cats.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)}
            className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium transition-colors ${activeCat === c.id ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"}`}
            data-testid={`cat-filter-${c.id}`}>{c.name}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-500">No dishes match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(d => <DishCard key={d.id} dish={d} />)}
        </div>
      )}
    </div>
  );
}
