import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";

import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Checkout from "@/pages/Checkout";
import MyOrders from "@/pages/MyOrders";
import OrderTracking from "@/pages/OrderTracking";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import Invoice from "@/pages/Invoice";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminMenu from "@/pages/admin/AdminMenu";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSales from "@/pages/admin/AdminSales";
import AdminOffers from "@/pages/admin/AdminOffers";
import ChefOrders from "@/pages/chef/ChefOrders";
import POS from "@/pages/pos/POS";
import Layout from "@/components/Layout";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/orders/:oid" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
        <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/payment/failure" element={<ProtectedRoute><PaymentFailure /></ProtectedRoute>} />
        <Route path="/orders/:oid/invoice" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin", "staff"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute roles={["admin", "staff"]}><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute roles={["admin", "staff"]}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={["admin", "staff"]}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/sales" element={<ProtectedRoute roles={["admin", "staff"]}><AdminSales /></ProtectedRoute>} />
        <Route path="/admin/offers" element={<ProtectedRoute roles={["admin", "staff"]}><AdminOffers /></ProtectedRoute>} />
        <Route path="/chef" element={<ProtectedRoute roles={["admin", "staff", "chef"]}><ChefOrders /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute roles={["admin", "staff", "salesman"]}><POS /></ProtectedRoute>} />
        <Route path="/admin/pos" element={<ProtectedRoute roles={["admin", "staff", "salesman"]}><POS /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-center" richColors />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
