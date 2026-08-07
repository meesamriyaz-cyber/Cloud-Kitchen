import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bike, ChefHat, Clock, Flame, ShieldCheck, Star, Utensils, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import DishCard from "@/components/DishCard";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const serviceStats = [
  { label: "Avg delivery", value: "30 min", icon: Clock },
  { label: "Rating", value: "4.8/5", icon: Star },
  { label: "Free delivery", value: "499+", icon: Bike },
];

const orderingSteps = [
  { title: "Choose fresh", copy: "Browse live availability and add dishes in one tap.", icon: Utensils },
  { title: "Pay your way", copy: "Cash on delivery or Razorpay online checkout.", icon: ShieldCheck },
  { title: "Track every stage", copy: "Follow placed, preparing, ready, and delivery updates.", icon: Bike },
];

export default function Home() {
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    axios.get(`${API}/dishes`).then(r => setDishes(r.data.slice(0, 6))).catch(() => {});
    axios.get(`${API}/categories`).then(r => setCats(r.data)).catch(() => {});
  }, []);

  const heroDish = useMemo(() => dishes[0], [dishes]);

  const [offers] = useState([
    { code: "MUKHTAR20", discount: "20% OFF", minOrder: 299, description: "On orders above ₹299" },
    { code: "FIRST50", discount: "₹50 OFF", minOrder: 499, description: "First order special" },
    { code: "FREEDEL", discount: "FREE DELIVERY", minOrder: 499, description: "No delivery fee" },
  ]);

  return (
    <div>
      <section className="relative overflow-hidden min-h-[620px] flex items-center">
        <div className="hero-scrim absolute inset-0" />
        <div className="relative max-w-7xl mx-auto px-5 py-14 md:py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-stone-200 px-3 py-1 text-xs text-orange-700 font-semibold shadow-sm">
                <Flame size={13} /> Fresh batches are cooked after you order
              </div>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none text-stone-950">
                Mukhtar Cloud Kitchen
              </h1>
              <p className="mt-5 text-lg text-stone-700 leading-relaxed max-w-xl">
                Biryani, tandoor, curries, Chinese favorites, desserts, and drinks from a fast kitchen built for online orders, dine-in support, and counter service.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/menu">
                  <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white h-12 px-6 text-base" data-testid="hero-order-now-btn">
                    Order now <ArrowRight size={16} className="ml-1" />
                  </Button>
                </Link>
                <Link to="/menu">
                  <Button variant="outline" className="rounded-full h-12 px-6 text-base bg-white/80" data-testid="hero-view-menu-btn">
                    View menu
                  </Button>
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2 max-w-xl">
                     {serviceStats.map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="soft-panel p-3">
                      <Icon size={16} className="text-orange-700" />
                      <div className="mt-2 font-display text-lg font-bold">{stat.value}</div>
                      <div className="text-[11px] text-stone-500">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              className="hidden lg:block"
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500",
                  "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500",
                  "https://images.unsplash.com/photo-1617692855027-33b14f061079?w=500",
                ].map((src, index) => (
                  <img key={src} src={src} alt="" className={`h-40 w-full object-cover rounded-2xl shadow-lg ${index === 1 ? "brightness-95 translate-y-4" : ""}`} />
                ))}
              </div>
              <div className="mt-4 soft-panel p-4">
                <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
                  <Tag size={16} /> Today's Offers
                </div>
                <div className="mt-3 space-y-2">
                  {offers.map(offer => (
                    <div key={offer.code} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{offer.discount}</span>
                      <span className="text-stone-500 text-xs">{offer.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Explore by category</h2>
            <p className="text-stone-500 text-sm mt-1">Quick lanes for your craving</p>
          </div>
          <Link to="/menu" className="text-sm text-orange-700 font-semibold hover:underline">See all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {cats.map((c, index) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: index * 0.03 }}
            >
              <Link to={`/menu?cat=${c.id}`} className="shrink-0 w-40 group block" data-testid={`home-cat-${c.id}`}>
                <div className="aspect-square overflow-hidden bg-stone-100">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="font-semibold text-sm mt-2">{c.name}</div>
              </Link>
            </motion.div>
          ))}
          {cats.length === 0 && (
            <div className="text-sm text-stone-500 py-4">Connect the API to show live categories here.</div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Current offers</h2>
            <p className="text-stone-500 text-sm mt-1">Save more on your first few orders</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {offers.map(offer => (
            <div key={offer.code} className="soft-panel p-5 border-l-4 border-l-orange-600">
              <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
                <Tag size={16} /> {offer.discount}
              </div>
              <p className="text-sm text-stone-600 mt-2">{offer.description}</p>
              <div className="mt-3 text-xs text-stone-500">Use code <span className="font-mono font-semibold text-stone-700">{offer.code}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Loved by customers</h2>
            <p className="text-stone-500 text-sm mt-1">Bestsellers ready for online ordering</p>
          </div>
          <Link to="/menu" className="hidden sm:inline-flex items-center gap-2 text-sm text-stone-700 font-semibold">
            Full menu <ArrowRight size={15} />
          </Link>
        </div>
        {dishes.length === 0 ? (
          <div className="soft-panel p-8 text-center text-stone-500">Menu data is not loaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dishes.map(d => <DishCard key={d.id} dish={d} />)}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="grid md:grid-cols-3 gap-4">
          {orderingSteps.map(step => {
            const Icon = step.icon;
            return (
               <div key={step.title} className="soft-panel p-5">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-700 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold mt-4">{step.title}</h3>
                <p className="text-sm text-stone-600 mt-1">{step.copy}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
