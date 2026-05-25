import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  trendValue?: string;
  accentColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accentColor = "bg-violet-100 text-violet-600",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            accentColor
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
          <span className="text-2xl font-bold tracking-tight leading-none">
            {value}
          </span>
          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 mt-1">
              {trend && trendValue && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    trend === "up" ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {trend === "up" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                  {trendValue}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
