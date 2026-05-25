"use client";

import { usePathname } from "next/navigation";
import { Clock, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateRange, type DateRange } from "@/hooks/use-date-range";
import { useTheme } from "@/hooks/use-theme";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/limits": "Limit Analysis",
  "/tokens": "Tokens",
  "/tools": "Tools",
  "/projects": "Projects",
  "/costs": "Costs",
  "/recommendations": "Tips",
  "/mockup": "Mockup",
};

const rangeLabels: Record<DateRange, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
};

export function Header() {
  const pathname = usePathname();
  const { range, setRange } = useDateRange();
  const { theme, toggleTheme } = useTheme();

  const title = pageTitles[pathname] ?? "Dashboard";
  const lastSync = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3 sm:px-4 lg:px-6">
      {/* Left: page title */}
      <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>

      {/* Right: controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date range selector */}
        <Select value={range} onValueChange={(val) => setRange(val as DateRange)}>
          <SelectTrigger className="h-8 w-[80px] sm:w-[100px] text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(rangeLabels) as [DateRange, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Theme toggle (visible on mobile, hidden on lg where sidebar has it) */}
        <button
          onClick={toggleTheme}
          className="md:hidden flex items-center justify-center size-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Last sync badge - hide on small screens */}
        <Badge variant="secondary" className="hidden sm:inline-flex gap-1.5 text-xs">
          <Clock className="size-3" />
          {lastSync}
        </Badge>

        {/* Plan badge */}
        <Badge variant="outline" className="text-xs">Max5</Badge>
      </div>
    </header>
  );
}
