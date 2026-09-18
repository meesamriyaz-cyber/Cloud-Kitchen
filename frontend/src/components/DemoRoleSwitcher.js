import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { X, UserRound, MonitorCog, ChefHat, ShieldCheck, ArrowRight } from "lucide-react";

const ROLES = [
  {
    role: "customer",
    label: "Customer",
    description: "Browse the menu, place orders and track them.",
    icon: UserRound,
  },
  {
    role: "staff",
    label: "Staff / POS",
    description: "Handle counter sales, POS orders and restaurant fulfillment.",
    icon: MonitorCog,
  },
  {
    role: "chef",
    label: "Kitchen / Chef",
    description: "View incoming orders and manage kitchen status.",
    icon: ChefHat,
  },
  {
    role: "admin",
    label: "Administrator",
    description: "Explore settings, menu, users, sales and reports.",
    icon: ShieldCheck,
  },
];

export default function DemoRoleSwitcher({ open, onClose }) {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSwitch = async (role) => {
    if (role === user?.role) {
      onClose();
      return;
    }

    setError("");
    setSwitching(true);

    try {
      await switchDemoRole(role);
      const landing = {
        customer: "/",
        staff: "/staff",
        chef: "/chef",
        admin: "/admin",
      }[role] || "/";
      onClose();
      navigate(landing, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to switch Demo role."
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-role-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !switching) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-700 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Demo Mode
            </div>
            <h2 id="demo-role-title" className="text-xl font-bold mt-1 text-stone-900 dark:text-stone-100">
              Switch Demo Role
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Explore Cloud Kitchen from different restaurant perspectives.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={switching}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close Demo role switcher"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {ROLES.map(({ role, label, description, icon: Icon }) => {
            const active = role === user?.role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleSwitch(role)}
                disabled={switching}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                }`}
                data-testid={`demo-role-${role}`}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  active
                    ? "bg-primary text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                }`}>
                  <Icon size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm text-stone-900 dark:text-stone-100">
                    {label}
                    {active && <span className="ml-2 text-xs font-medium text-primary">Current</span>}
                  </span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {description}
                  </span>
                </span>
                <ArrowRight size={16} className="text-stone-400 shrink-0" />
              </button>
            );
          })}

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 px-3 py-2 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-stone-50 dark:bg-stone-950/40 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
          Demo role changes do not alter your real restaurant account.
        </div>
      </div>
    </div>
  );
}
