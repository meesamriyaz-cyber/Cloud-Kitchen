import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import CartSheet from "@/components/CartSheet";
import { ShoppingBag, User, LogOut, Menu as MenuIcon, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export default function Layout() {
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    { to: "/", label: "Home" },
    { to: "/menu", label: "Menu" },
    ...(user ? [{ to: "/orders", label: "My Orders" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 relative">
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-9 h-9 rounded-full bg-[#E76F51] text-white flex items-center justify-center">
              <ChefHat size={18} />
            </div>
            <div className="leading-none">
              <div className="font-display font-bold text-lg tracking-tight">Mukhtar</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Cloud Kitchen</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {nav.map(n => (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`nav-link-${n.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname === n.to ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
                }`}
              >{n.label}</Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="relative rounded-full bg-stone-100 hover:bg-stone-200 transition-colors p-2.5"
              data-testid="cart-button"
            >
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E76F51] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full bg-stone-100 hover:bg-stone-200 transition-colors p-2.5" data-testid="user-menu-button">
                    <User size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs text-stone-500">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-my-orders">My Orders</DropdownMenuItem>
                  {user.role === "admin" && <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">Admin Dashboard</DropdownMenuItem>}
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
                  className="rounded-full hidden sm:inline-flex"
                  onClick={() => navigate("/login")}
                  data-testid="header-login-btn"
                >Login</Button>
                <Button
                  className="rounded-full bg-[#E76F51] hover:bg-[#D85C3E] text-white"
                  onClick={() => navigate("/signup")}
                  data-testid="header-signup-btn"
                >Sign up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pb-24">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 mt-10">
        <div className="max-w-7xl mx-auto px-5 py-8 text-sm text-stone-500 flex flex-wrap items-center justify-between gap-3">
          <div>&copy; {new Date().getFullYear()} Mukhtar Cloud Kitchen. Cooked with love.</div>
          <div className="flex items-center gap-4">
            <Link to="/menu" className="hover:text-stone-800">Menu</Link>
            <Link to="/orders" className="hover:text-stone-800">Orders</Link>
          </div>
        </div>
      </footer>

      <CartSheet />
    </div>
  );
}
