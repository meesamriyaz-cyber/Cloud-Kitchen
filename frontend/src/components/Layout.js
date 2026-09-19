import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useFirm } from "@/context/FirmContext";
import CartSheet from "@/components/CartSheet";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollToTop from "@/components/ScrollToTop";
import { ChefHat, Home, LayoutDashboard, LogOut, MonitorCog, ReceiptText, ShoppingBag, Tag, User, Utensils, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export default function Layout() {
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const { firm } = useFirm();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isSalesman = user?.role === "salesman";
  const isChef = user?.role === "chef";
  const isOpsRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/staff") || location.pathname.startsWith("/pos") || location.pathname.startsWith("/chef");

  const nav = [
    { to: "/", label: "Home", icon: Home },
    { to: "/menu", label: "Menu", icon: Utensils },
    ...(user && !isChef ? [{ to: "/orders", label: "My Orders", icon: ReceiptText }] : []),
    ...(isAdmin ? [
      { to: "/admin", label: "Admin", icon: LayoutDashboard },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/sales", label: "Sales", icon: TrendingUp },
      { to: "/admin/offers", label: "Offers", icon: Tag },
    ] : []),
    ...(isStaff ? [
      { to: "/staff", label: "Staff", icon: LayoutDashboard },
      { to: "/pos", label: "POS", icon: MonitorCog },
    ] : []),
    ...(isAdmin ? [
      { to: "/pos", label: "POS", icon: MonitorCog },
    ] : []),
    ...(isSalesman ? [
      { to: "/pos", label: "POS", icon: MonitorCog },
    ] : []),
    ...(isChef ? [
      { to: "/chef", label: "Kitchen", icon: ChefHat },
    ] : []),
  ];

  return (
    <div className={`min-h-screen text-stone-900 relative ${isOpsRoute ? "ops-shell" : "bg-background"} ${!isOpsRoute ? "cursor-brand" : ""}`}>
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
              <ChefHat size={18} />
            </div>
            <div className="leading-none">
              <div className="font-display font-bold text-lg tracking-tight">{firm.short_name || firm.name}</div>
              <div className="text-[10px] uppercase text-stone-500 dark:text-stone-400">{firm.business_type || "Restaurant"}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {nav.map(n => {
              const Icon = n.icon;
              const active = n.to === "/" ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-link-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={`h-10 px-4 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2 ${active ? "bg-primary text-white shadow-sm" : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`}
                >
                  <Icon size={15} />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!isOpsRoute && (
              <button
                onClick={() => setOpen(true)}
                className="relative rounded-full bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors p-2.5"
                data-testid="cart-button"
                aria-label="Open cart"
              >
                <ShoppingBag size={18} className="text-stone-600 dark:text-stone-300" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full bg-white dark:bg-stone-800 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 transition-colors p-2.5" data-testid="user-menu-button" aria-label="Open user menu">
                    <User size={18} className="text-stone-600 dark:text-stone-300" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  {!isChef && <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-my-orders">My Orders</DropdownMenuItem>}
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">Admin Dashboard</DropdownMenuItem>}
                  {isStaff && <DropdownMenuItem onClick={() => navigate("/staff")} data-testid="menu-staff">Staff Dashboard</DropdownMenuItem>}
                  {(isAdmin || isStaff || isSalesman) && (
                    <DropdownMenuItem onClick={() => navigate("/pos")} data-testid="menu-pos">
                      <MonitorCog size={14} className="mr-2" /> POS
                    </DropdownMenuItem>
                  )}
                  {isChef && (
                    <DropdownMenuItem onClick={() => navigate("/chef")} data-testid="menu-chef">
                      <ChefHat size={14} className="mr-2" /> Kitchen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout">
                    <LogOut size={14} className="mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="rounded-full hidden sm:inline-flex text-stone-600 dark:text-stone-300"
                  onClick={() => navigate("/login")}
                  data-testid="header-login-btn"
                >Login</Button>
                <Button
                  className="rounded-full bg-primary hover:opacity-95 text-white"
                  onClick={() => navigate("/signup")}
                  data-testid="header-signup-btn"
                >Sign up</Button>
              </>
            )}
          </div>
        </div>
        <nav className="md:hidden px-3 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {nav.map(n => {
            const Icon = n.icon;
            const active = n.to === "/" ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`mobile-nav-link-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`shrink-0 h-10 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 border ${active ? "bg-primary text-white border-primary" : "bg-white/80 dark:bg-stone-800/70 text-stone-700 border-stone-200"}`}
              >
                <Icon size={14} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={isOpsRoute ? "pb-8" : "pb-20"}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>

      <ScrollToTop />

      {!isOpsRoute && (
        <footer className="border-t border-stone-200 dark:border-stone-700 mt-10 bg-white/50 dark:bg-stone-900/50">
          <div className="max-w-7xl mx-auto px-5 py-8 text-sm text-stone-500 dark:text-stone-400 flex flex-wrap items-center justify-between gap-3">
            <div>&copy; {new Date().getFullYear()} {firm.name}. {firm.tagline}</div>
            <div className="flex items-center gap-4">
              <Link to="/menu" className="hover:text-stone-800 dark:hover:text-stone-200">Menu</Link>
              <Link to="/orders" className="hover:text-stone-800 dark:hover:text-stone-200">Orders</Link>
            </div>
          </div>
        </footer>
      )}

      <CartSheet />
    </div>
  );
}
