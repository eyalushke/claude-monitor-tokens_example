"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Cpu,
  Wrench,
  FolderOpen,
  DollarSign,
  Lightbulb,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { label: "Overview", href: "/", icon: BarChart3 },
  { label: "Limits", href: "/limits", icon: AlertTriangle },
  { label: "Tokens", href: "/tokens", icon: Cpu },
  { label: "Tools", href: "/tools", icon: Wrench },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Costs", href: "/costs", icon: DollarSign },
  { label: "Tips", href: "/recommendations", icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Desktop / Tablet Sidebar (hidden on mobile) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-border bg-background",
          "md:w-16 lg:w-56"
        )}
      >
        {/* App title */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <Activity className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight hidden lg:block">
            Claude Code Monitor
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle */}
        <div className="border-t border-border px-2 py-3">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
            <span className="hidden lg:block">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation (iPhone style) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-pb">
        <div className="grid grid-cols-7 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:scale-95",
                  active
                    ? "text-violet-500"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
