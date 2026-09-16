import React, { useState } from "react";
import axios from "axios";
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
import ChefOrders from "@/pages/chef/ChefOrders";
import POS from "@/pages/pos/POS";
import Layout from "@/components/Layout";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function LicenseGate({ children }) {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkLicense = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/license/status`
      );

      setLicense(res.data);
    } catch {
       if (err.response?.data) {
    setLicense(err.response.data);
    return;
  }

  // Genuine network/connectivity failure.
    setLicense({
      status: "unknown",
      offline: true,
    });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkLicense();
  }, []);

  const activate = async () => {
    const value = code.trim().toUpperCase();

    if (value.length !== 10) {
      setError("Please enter a valid 10-character activation code.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/license/activate`,
        { code: value }
      );

      setLicense(res.data);
      setCode("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Activation failed. Check the code and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 dark:border-stone-700 border-t-primary" />
      </div>
    );
  }

  const locked =
    license?.locked === true ||
    license?.status === "expired";

  const isValid =
    ["active", "trial"].includes(license?.status) &&
    !locked;

  if (isValid) {
    return children;
  }

  const reason = license?.reason;

  const deviceTransferred =
    reason === "device_transferred";
  
  const machineMismatch =
  reason === "machine_fingerprint_mismatch";

  const graceExpired =
    reason === "offline_grace_expired";

  const licenseExpired =
    reason === "license_expired" ||
    license?.status === "expired";

 const activatingTransferredDevice =
  reason === "activate_transferred_device";

const showActivation =
  activatingTransferredDevice ||
  (
    !deviceTransferred &&
    !machineMismatch &&
    !graceExpired &&
    !licenseExpired
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-background">

      <div className="w-full max-w-md rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-7 shadow-sm">

        {/* DEVICE TRANSFERRED */}

      {deviceTransferred && (
  <>
    <div className="text-4xl mb-4">
      🔒
    </div>

    <h1 className="font-display text-2xl font-bold">
      This Installation Is No Longer Active
    </h1>

    <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
      Your Cloud Kitchen license has been transferred to another
      device. This installation can no longer access the application.
    </p>

    <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
      To restore Cloud Kitchen on this computer, transfer the license
      back from the currently active device in the Cutting Edge
      Marketplace and generate a new activation code.
    </p>

    <button
      type="button"
      onClick={() => {
        setLicense({
          ...license,
          reason: "activate_transferred_device"
        });
        setError("");
      }}
      className="mt-6 w-full h-11 rounded-xl bg-primary text-white font-medium"
    >
      Activate This Device
    </button>

    <button
      type="button"
      onClick={checkLicense}
      disabled={loading || busy}
      className="mt-3 w-full h-11 rounded-xl border border-stone-300 dark:border-stone-600 font-medium disabled:opacity-50"
    >
      Check License Again
    </button>
  </>
)}

{/* MACHINE FINGERPRINT MISMATCH */}

{machineMismatch && (
  <>
    <div className="text-4xl mb-4">
      🖥️🔒
    </div>

    <h1 className="font-display text-2xl font-bold">
      License Bound to Another Computer
    </h1>

    <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
      This Cloud Kitchen license is registered to a different computer.
      For security, this installation cannot use the copied license.
    </p>

    <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
      To use Cloud Kitchen on this computer, transfer the license from
      the Cutting Edge Marketplace and generate a new activation code.
    </p>

    <button
      type="button"
      onClick={() => {
        setLicense({
          ...license,
          reason: "activate_transferred_device"
        });
        setError("");
      }}
      className="mt-6 w-full h-11 rounded-xl bg-primary text-white font-medium"
    >
      Activate This Device
    </button>

    <button
      type="button"
      onClick={checkLicense}
      disabled={loading || busy}
      className="mt-3 w-full h-11 rounded-xl border border-stone-300 dark:border-stone-600 font-medium disabled:opacity-50"
    >
      Check License Again
    </button>
  </>
)}
        {/* OFFLINE GRACE EXPIRED */}

        {graceExpired && (
          <>
            <div className="text-4xl mb-4">
              🌐
            </div>

            <h1 className="font-display text-2xl font-bold">
              Internet Connection Required
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Cloud Kitchen has not been able to validate your license
              within the allowed offline period.
            </p>

            <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Connect this computer to the internet and try again.
            </p>

            <button
              type="button"
              onClick={checkLicense}
              disabled={loading}
              className="mt-6 w-full h-11 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
            >
              Check License Again
            </button>
          </>
        )}

        {/* LICENSE EXPIRED */}

        {licenseExpired && (
          <>
            <div className="text-4xl mb-4">
              ⏳
            </div>

            <h1 className="font-display text-2xl font-bold">
              License Expired
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Your Cloud Kitchen trial or license has expired.
            </p>

            <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Renew or purchase the application from the Cutting Edge
              Marketplace, then activate this installation with a new code.
            </p>

            <button
              type="button"
              onClick={checkLicense}
              disabled={loading}
              className="mt-6 w-full h-11 rounded-xl border border-stone-300 dark:border-stone-600 font-medium disabled:opacity-50"
            >
              Check License Again
            </button>
          </>
        )}

        {/* NEW / UNACTIVATED INSTALLATION */}

        {showActivation && (
          <>
            <div className="text-4xl mb-4">
              🔑
            </div>

           <h1 className="font-display text-2xl font-bold">
  {activatingTransferredDevice
    ? "Reactivate This Device"
    : "Application Activation"}
</h1>

<p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
  {activatingTransferredDevice
    ? "After transferring the license back to this device in the Cutting Edge Marketplace, generate a new activation code and enter it below."
    : "Your Cloud Kitchen license is not currently active. Purchase or activate the application in the Cutting Edge Marketplace, generate an activation code, and enter it below."}
</p>

            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .replace(/[^a-z0-9]/gi, "")
                    .slice(0, 10)
                    .toUpperCase()
                )
              }
              placeholder="10-character activation code"
              maxLength={10}
              className="mt-5 w-full h-11 rounded-xl border border-stone-300 dark:border-stone-600 bg-transparent px-3 font-mono tracking-widest uppercase"
            />

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy || code.length !== 10}
              onClick={activate}
              className="mt-3 w-full h-11 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
            >
              {busy
                ? "Activating..."
                : "Activate Application"}
            </button>

            {license?.offline && (
              <p className="mt-3 text-xs text-amber-700">
                The Marketplace could not be reached. Connect this computer
                to the internet and try again.
              </p>
            )}
          </>
        )}

      </div>

    </div>
  );
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
      <Route element={<SetupGate><LicenseGate><Layout /></LicenseGate></SetupGate>}>
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
