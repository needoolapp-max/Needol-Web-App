import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary hover:bg-secondary"
    >
      {isDark ? <Sun className="h-4 w-4 text-accent" /> : <Moon className="h-4 w-4 text-primary" />}
    </button>
  );
}
