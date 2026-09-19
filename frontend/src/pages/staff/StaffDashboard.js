import React from "react";
import { Link } from "react-router-dom";
import { ChefHat, MonitorCog, ArrowUpRight } from "lucide-react";

const actions = [
  {
    to: "/pos",
    title: "Open POS",
    description: "Create and manage walk-in, dine-in, and pickup orders.",
    icon: MonitorCog,
    testId: "staff-goto-pos",
  },
  {
    to: "/chef",
    title: "Kitchen Display",
    description: "View the kitchen queue and track preparation status.",
    icon: ChefHat,
    testId: "staff-goto-kitchen",
  },
];

export default function StaffDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <ChefHat size={13} /> Staff workspace
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 dark:text-stone-100">
          Staff Dashboard
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-2xl">
          Your workspace for day-to-day restaurant operations.
        </p>
      </div>

      <section className="mt-7 grid sm:grid-cols-2 xl:grid-cols-2 gap-4" aria-label="Staff actions">
        {actions.map(({ to, title, description, icon: Icon, testId }) => (
          <Link
            key={to}
            to={to}
            data-testid={testId}
            className="soft-panel p-5 group hover:border-primary/40 dark:hover:border-stone-600 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mb-4">
              <Icon size={18} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold dark:text-stone-100">{title}</h2>
              <ArrowUpRight size={16} className="text-stone-400 group-hover:text-primary" />
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">{description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
