import React from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BootstrapProvider, useBootstrap } from "@/context/BootstrapContext";
import { CartProvider } from "@/context/CartContext";
import { FirmProvider } from "@/context/FirmContext";
import { Toaster } from "sonner";

import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Checkout from "@/pages/Checkout";
import MyOrders from "@/pages/MyOrders";
import OrderTracking from "@/pages/OrderTracking";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import Invoice from "@/pages/Invoice";
import ReceiptPrint from "@/pages/ReceiptPrint";
import Setup from "@/pages/Setup";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminMenu from "@/pages/admin/AdminMenu";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSales from "@/pages/admin/AdminSales";
import AdminOffers from "@/pages/admin/AdminOffers";
import StaffDashboard from "@/pages/staff/StaffDashboard";
import ChefOrders from "@/pages/chef/ChefOrders";
import POS from "@/pages/pos/POS";
import Layout from "@/components/Layout";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user.role)) {
    const fallback = user.role === "staff" ? "/staff" : user.role === "chef" ? "/chef" : user.role === "salesman" ? "/pos" : "/";
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function SetupGate({ children }) {
  const { status, loading, error } = useBootstrap();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center px-5 text-center text-sm text-stone-600">{error}</div>;
  if (status?.needs_setup) return <Navigate to="/setup" replace />;
  return children;
}

function SetupRoute() {
  const { status, loading } = useBootstrap();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary"></div></div>;
  if (!status?.needs_setup) return <Navigate to="/admin" replace />;
  return <Setup />;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupRoute />} />
      <Route element={<SetupGate><Layout /></SetupGate>}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/orders/:oid" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
        <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/payment/failure" element={<ProtectedRoute><PaymentFailure /></ProtectedRoute>} />
        <Route path="/orders/:oid/invoice" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
        <Route path="/orders/:oid/receipt" element={<ProtectedRoute><ReceiptPrint /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/staff" element={<ProtectedRoute roles={["staff"]}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute roles={["admin"]}><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute roles={["admin"]}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/sales" element={<ProtectedRoute roles={["admin"]}><AdminSales /></ProtectedRoute>} />
        <Route path="/admin/offers" element={<ProtectedRoute roles={["admin"]}><AdminOffers /></ProtectedRoute>} />
        <Route path="/chef" element={<ProtectedRoute roles={["chef"]}><ChefOrders /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute roles={["admin", "staff", "salesman"]}><POS /></ProtectedRoute>} />
        <Route path="/admin/pos" element={<ProtectedRoute roles={["admin", "staff", "salesman"]}><POS /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App page-wrapper">
      <AuthProvider>
        <FirmProvider>
          <CartProvider>
            <BrowserRouter>
              <BootstrapProvider>
                <AppRouter />
                <Toaster position="top-center" richColors closeButton />
              </BootstrapProvider>
            </BrowserRouter>
          </CartProvider>
        </FirmProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
