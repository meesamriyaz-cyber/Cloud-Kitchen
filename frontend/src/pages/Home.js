import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bike, ChefHat, Clock, Flame, Leaf, Beef, ShieldCheck, Star, Utensils, Tag, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import DishCard from "@/components/DishCard";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const heroImages = [
  "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBiaXJ5YW5pJTIwZGlzaHxlbnwwfHx8fDE3ODU4NjAwODB8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHw0fHxpbmRpYW4lMjBiaXJ5YW5pJTIwZGlzaHxlbnwwfHx8fDE3ODU4NjAwODB8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1617692855027-33b14f061079?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHw0fHx0YW5kb29yaSUyMGNoaWNrZW4lMjBkaXNofGVufDB8fHx8MTc4NTg2MDA4MHww&ixlib=rb-4.1.0&q=85",
];

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.12,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Home() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);
  const [offers, setOffers] = useState([]);
  const [heroDish, setHeroDish] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API}/dishes`).then(r => setDishes(r.data.slice(0, 6))).catch(() => {});
    axios.get(`${API}/dishes/featured`).then(r => setHeroDish(r.data)).catch(() => {});
    axios.get(`${API}/categories`).then(r => setCats(r.data)).catch(() => {});
    axios.get(`${API}/coupons/active`).then(r => setOffers(r.data)).catch(() => {})
    .finally(() => setLoaded(true));
  }, []);

  const displayedOffers = offers.map(o => ({
    code: o.code,
    discount: o.discount_type === "percent" ? `${o.value}% OFF` : `₹${o.value} OFF`,
    minOrder: o.min_order,
    description: o.discount_type === "percent"
      ? `Get ${o.value}% off when you spend ₹${o.min_order || 0} or more`
      : `Get ₹${o.value} off when you spend ₹${o.min_order || 0} or more`,
  }));

  return (
    <motion.div
      className="page-wrapper"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <section className="relative overflow-hidden min-h-[620px] flex items-center">
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.04] bg-[url('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center" />

        <div className="relative max-w-7xl mx-auto px-5 py-14 md:py-16 w-full">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <motion.div
              variants={item}
              className="z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs text-primary font-semibold shadow-sm">
                <Flame size={13} /> Fresh batches are cooked after you order
              </div>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none text-stone-950 dark:text-stone-50">
                Mukhtar Cloud Kitchen
              </h1>
              <p className="mt-5 text-lg text-stone-700 dark:text-stone-400 leading-relaxed max-w-xl">
                Biryani, tandoor, curries, Chinese favorites, desserts, and drinks from a fast kitchen built for online orders, dine-in support, and counter service.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/menu">
                  <Button className="rounded-full bg-primary hover:opacity-95 text-white h-12 px-6 text-base shadow-lg shadow-primary/25" data-testid="hero-order-now-btn">
                    Order now <ArrowRight size={16} className="ml-1" />
                  </Button>
                </Link>
                <Link to="/menu">
                  <Button variant="outline" className="rounded-full h-12 px-6 text-base bg-white/80 dark:bg-stone-800/80 dark:text-stone-200" data-testid="hero-view-menu-btn">
                    View menu
                  </Button>
                </Link>
              </div>

              <motion.div
                className="mt-8 grid grid-cols-3 gap-2 max-w-xl"
                variants={container}
              >
                {serviceStats.map((stat, index) => {
                  const Icon = stat.icon;
                  const isRating = stat.label === "Rating";
                  return (
                    <motion.div
                      key={stat.label}
                      variants={item}
                      transition={{ delay: index * 0.04 }}
                    >
                      <div className={`soft-panel p-3 flex flex-col items-center text-center ${isRating ? "ring-1 ring-yellow-200/50 dark:ring-yellow-800/50" : ""}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isRating ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white" : "bg-primary/10 text-primary"}`}>
                          <Icon size={18} />
                        </div>
                        <div className={`font-display text-lg font-bold ${isRating ? "text-yellow-500" : ""}`}>{stat.value}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">{stat.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
                className="relative z-10 hidden lg:block"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 dark:from-primary/25 dark:to-secondary/25 blur-2xl rounded-full opacity-70 dark:opacity-80 pointer-events-none" />
                  <div className="relative w-[420px] h-[460px] rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
                    <img
                      src={heroDish?.image_url || heroImages[0]}
                      alt={heroDish?.name || "Featured dish"}
                      className="w-full h-full object-cover"
                      data-testid="hero-dish-image"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                      <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-bold px-3 py-1.5 backdrop-blur-sm text-white shadow-lg shadow-primary/30 ring-1 ring-white/20">
                        <Star size={11} /> DEAL OF THE DAY
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 text-xs font-medium px-2.5 py-1 backdrop-blur-sm">
                        <Flame size={11} /> {heroDish?.spice_level || "medium"} spice
                      </div>
                      <h3 className="font-display text-2xl font-bold mt-2 leading-tight">{heroDish?.name || "Featured dish"}</h3>
                      {heroDish?.price && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xl font-bold text-primary">₹{Math.round(heroDish.price)}</span>
                          {heroDish.veg ? (
                            <span className="text-[10px] font-semibold uppercase border border-white/30 text-white rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                              <Leaf size={10} className="inline" /> Veg
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase border border-white/30 text-white rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                              <Beef size={10} className="inline" /> Non-veg
                            </span>
                          )}
                          <span className="text-[10px] font-semibold uppercase border border-white/30 text-white rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                            ⭐ Popular
                          </span>
                        </div>
                      )}
                      {heroDish?.description && (
                        <p className="text-sm text-white/80 mt-2 line-clamp-2">{heroDish.description}</p>
                      )}
                      <button
                        onClick={() => {
                          const dish = heroDish || (dishes.length > 0 ? dishes[0] : null);
                          if (dish) { addItem(dish); navigate("/checkout"); }
                          else { navigate("/menu"); }
                        }}
                        className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-primary hover:opacity-90 mt-3 h-8 px-3 rounded-full"
                        data-testid="hero-order-now"
                      >
                        Order now <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
          </div>
        </div>
      </section>

      <motion.section
        className="max-w-7xl mx-auto px-5 py-10"
        variants={item}
      >
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Explore by category</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Quick lanes for your favorite cuisines</p>
          </div>
          <Link to="/menu" className="text-sm text-primary font-semibold hover:underline">See all</Link>
        </div>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {cats.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.03, duration: 0.55, ease: "easeOut" }}
              >
                <Link to={`/menu?cat=${c.id}`} className="shrink-0 w-44 group block" data-testid={`home-cat-${c.id}`}>
                  <div className="relative aspect-square overflow-hidden bg-stone-100 rounded-2xl">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 font-display font-semibold">Mukhtar</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white font-semibold text-sm">{c.name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
            {cats.length === 0 && loaded && (
              <div className="text-sm text-stone-500 dark:text-stone-400 py-4">No categories available yet.</div>
            )}
            {!loaded && (
              <div className="text-sm text-stone-500 dark:text-stone-400 py-4">Loading categories...</div>
            )}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="max-w-7xl mx-auto px-5 py-10"
        variants={item}
      >
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Current offers</h2>
             <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Active promotions from our kitchen</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {displayedOffers.map((offer, index) => (
            <motion.div
              key={offer.code}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="relative soft-panel p-6 border-l-4 border-l-primary overflow-hidden group"
            >
              <div className="absolute top-3 right-3 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-1 rounded-full">
                {offer.code}
              </div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Tag size={16} /> {offer.discount}
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-xs">{offer.description}</p>
              <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                Min order: ₹{offer.minOrder || 0} · Use code <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">{offer.code}</span>
              </div>
              <Link
                to="/menu"
                className="absolute inset-0"
                data-testid={`offer-${offer.code.toLowerCase()}`}
              />
            </motion.div>
          ))}
          {displayedOffers.length === 0 && loaded && (
            <div className="text-sm text-stone-500 dark:text-stone-400 py-4">No current offers. Check back later!</div>
          )}
        </div>
      </motion.section>

      <motion.section
        className="max-w-7xl mx-auto px-5 py-10"
        variants={item}
      >
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Loved by customers</h2>
             <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Our most popular dishes</p>
          </div>
          <Link to="/menu" className="hidden sm:inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 font-semibold">
            Full menu <ArrowRight size={15} />
          </Link>
        </div>

        {dishes.length === 0 && loaded ? (
          <motion.div
            className="soft-panel p-8 text-center text-stone-500 dark:text-stone-400"
            variants={item}
          >
            Menu data is not loaded yet.
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={container}
          >
            {dishes.map((d, index) => (
              <motion.div
                key={d.id}
                layoutId={d.id}
                variants={item}
                transition={{ delay: index * 0.05 }}
              >
                <DishCard dish={d} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="max-w-7xl mx-auto px-5 py-10"
        variants={item}
      >
        <div className="grid md:grid-cols-3 gap-4">
          {orderingSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="soft-panel p-6 text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.55, ease: "easeOut" }}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold mt-4">{step.title}</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{step.copy}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
