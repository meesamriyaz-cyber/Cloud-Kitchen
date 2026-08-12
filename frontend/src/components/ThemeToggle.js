import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      className="relative flex h-10 w-18 items-center rounded-full bg-white/80 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-100 dark:hover:bg-stone-700/80 shadow-sm"
      aria-label="Toggle dark mode"
      data-testid="theme-toggle"
      type="button"
    >
      <motion.span
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-stone-700 dark:text-stone-200"
        initial={false}
        animate={{
          x: isDark ? 32 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
      >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </motion.span>
      <span className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20" />
    </motion.button>
  );
}
