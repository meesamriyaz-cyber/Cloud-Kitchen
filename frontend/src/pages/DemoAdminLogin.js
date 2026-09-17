import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const APP_MODE = process.env.REACT_APP_APP_MODE || "production";

export default function DemoAdminLogin() {
  const { user, loading, demoAdminLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  if (APP_MODE !== "demo") {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-stone-200 border-t-primary" />
      </div>
    );
  }

  if (user?.role === "admin" || user?.role === "staff") {
    return <Navigate to="/admin" replace />;
  }

  const handleDemoLogin = async () => {
    setError("");
    setLoggingIn(true);

    try {
      await demoAdminLogin();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to enter the demo administrator area."
      );
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">⚙️</span>
          </div>

          <h1 className="text-2xl font-bold text-stone-900">
            Cloud Kitchen Demo
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Explore the administrator dashboard using the preconfigured demo
            restaurant.
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loggingIn}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loggingIn ? "Entering Demo..." : "Enter Admin Demo"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-xl border border-stone-300 px-5 py-3 font-medium text-stone-700 hover:bg-stone-50"
          >
            Back to Customer
          </button>

          <p className="mt-6 text-xs text-stone-500">
            Demo Mode · No administrator password required
          </p>
        </div>
      </div>
    </div>
  );
}