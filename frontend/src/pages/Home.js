import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Flame, Clock, Truck, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DishCard from "@/components/DishCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    axios.get(`${API}/dishes`).then(r => setDishes(r.data.slice(0, 6))).catch(() => {});
    axios.get(`${API}/categories`).then(r => setCats(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 pt-10 pb-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-xs text-[#E76F51] font-medium">
              <Flame size={13} /> Freshly cooked. Delivered hot.
            </div>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none">
              Home-style <span className="text-[#E76F51]">biryani</span> & curries,<br />
              delivered in <span className="underline decoration-[#F4A261] decoration-4 underline-offset-4">30 mins</span>.
            </h1>
            <p className="mt-5 text-stone-600 leading-relaxed max-w-md">
              A cloud kitchen crafting hand-tossed tandoor, dum biryani and multi-cuisine comfort — cooked fresh only after you order.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/menu">
                <Button className="rounded-full bg-stone-900 hover:bg-stone-800 text-white h-12 px-6 text-base" data-testid="hero-order-now-btn">
                  Order now <ArrowRight size={16} className="ml-1" />
                </Button>
              </Link>
              <Link to="/menu">
                <Button variant="ghost" className="rounded-full h-12 px-6 text-base" data-testid="hero-view-menu-btn">View menu</Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-stone-600">
              <div className="flex items-center gap-2"><Clock size={16} className="text-[#E76F51]" /> 30-min avg</div>
              <div className="flex items-center gap-2"><Truck size={16} className="text-[#E76F51]" /> Free above ₹499</div>
              <div className="flex items-center gap-2"><Star size={16} className="text-[#F4A261] fill-[#F4A261]" /> 4.8 rating</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-orange-100 via-transparent to-amber-50 blur-2xl rounded-[3rem]" />
            <div className="relative grid grid-cols-6 grid-rows-6 gap-3 h-[440px]">
              <div className="col-span-4 row-span-4 rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(231,111,81,0.4)]">
                <img src="https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800" alt="biryani" className="w-full h-full object-cover" />
              </div>
              <div className="col-span-2 row-span-3 rounded-3xl overflow-hidden shadow-lg">
                <img src="https://images.unsplash.com/photo-1617692855027-33b14f061079?w=500" alt="tandoor" className="w-full h-full object-cover" />
              </div>
              <div className="col-span-2 row-span-3 rounded-3xl overflow-hidden bg-stone-900 text-white p-5 flex flex-col justify-end">
                <div className="text-4xl font-display font-bold leading-none">40+</div>
                <div className="text-xs text-stone-400 mt-1 uppercase tracking-widest">Dishes</div>
              </div>
              <div className="col-span-4 row-span-2 rounded-3xl overflow-hidden bg-[#E76F51] text-white p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest opacity-90">Chef's special</div>
                  <div className="font-display font-bold text-lg mt-1">Slow-cooked Mutton Biryani</div>
                </div>
                <ArrowRight />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Explore by category</h2>
            <p className="text-stone-500 text-sm mt-1">Pick your craving</p>
          </div>
          <Link to="/menu" className="text-sm text-[#E76F51] font-medium hover:underline">See all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {cats.map(c => (
            <Link key={c.id} to={`/menu?cat=${c.id}`}
              className="shrink-0 w-40 group" data-testid={`home-cat-${c.id}`}>
              <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 mb-2">
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="font-medium text-sm">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Loved by our customers</h2>
            <p className="text-stone-500 text-sm mt-1">Bestsellers this week</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dishes.map(d => <DishCard key={d.id} dish={d} />)}
        </div>
      </section>
    </div>
  );
}
