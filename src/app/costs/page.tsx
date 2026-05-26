"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Zap,
  GitCommit,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/cards/stat-card";
import { useDateRange } from "@/hooks/use-date-range";
import { MODEL_PRICING } from "@/lib/constants";
import type { DailyAggregate } from "@/lib/supabase/types";
// ─── Sample Data ───────────────────────────────────────────────

const SAMPLE_COST_DATA = [
  { date: "May 19", opus: 2.85, sonnet: 0.42, haiku: 0.08 },
  { date: "May 20", opus: 4.12, sonnet: 0.31, haiku: 0.05 },
  { date: "May 21", opus: 1.95, sonnet: 0.78, haiku: 0.06 },
  { date: "May 22", opus: 5.67, sonnet: 0.18, haiku: 0.03 },
  { date: "May 23", opus: 3.42, sonnet: 0.52, haiku: 0.07 },
  { date: "May 24", opus: 4.88, sonnet: 0.25, haiku: 0.04 },
  { date: "May 25", opus: 2.64, sonnet: 0.38, haiku: 0.05 },
];

const MODEL_COLORS = {
  opus: "#8B5CF6",
  sonnet: "#3B82F6",
  haiku: "#10B981",
};

// ─── Helpers ───────────────────────────────────────────────────

interface CostRow {
  date: string;
  opus: number;
  sonnet: number;
  haiku: number;
}


function computeModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number
): number {
  let pricing = MODEL_PRICING["claude-opus"];
  if (model.includes("sonnet")) pricing = MODEL_PRICING["claude-sonnet"];
  else if (model.includes("haiku")) pricing = MODEL_PRICING["claude-haiku"];

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheReadTokens / 1_000_000) * pricing.cacheRead +
    (cacheCreationTokens / 1_000_000) * pricing.cacheCreation
  );
}

function aggregateCosts(rows: DailyAggregate[]): CostRow[] {
  const map = new Map<string, { opus: number; sonnet: number; haiku: number }>();

  for (const r of rows) {
    const existing = map.get(r.date) ?? { opus: 0, sonnet: 0, haiku: 0 };
    const model = r.model || "";
    const cost = computeModelCost(
      model,
      r.total_input_tokens,
      r.total_output_tokens,
      r.total_cache_read_tokens,
      r.total_cache_creation_tokens
    );

    if (model.includes("sonnet")) existing.sonnet += cost;
    else if (model.includes("haiku")) existing.haiku += cost;
    else existing.opus += cost;

    map.set(r.date, existing);
  }

  return Array.from(map.entries())
    .map(([date, costs]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      opus: Number(costs.opus.toFixed(2)),
      sonnet: Number(costs.sonnet.toFixed(2)),
      haiku: Number(costs.haiku.toFixed(2)),
    }))
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

// ─── Page Component ────────────────────────────────────────────

export default function CostsPage() {
  const { dateStr } = useDateRange();
  const [costData, setCostData] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setCostData(SAMPLE_COST_DATA);
        setIsLive(false);
        setLoading(false);
        return;
      }

      try {
        const { createBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("daily_aggregates")
          .select("*")
          .gte("date", dateStr)
          .order("date", { ascending: true });

        if (error || !data || data.length === 0) {
          setCostData(SAMPLE_COST_DATA);
          setIsLive(false);
        } else {
          setCostData(aggregateCosts(data as DailyAggregate[]));
          setIsLive(true);
        }
      } catch {
        setCostData(SAMPLE_COST_DATA);
        setIsLive(false);
      }
      setLoading(false);
    }

    fetchData();
  }, [dateStr]);

  // Compute KPIs from cost data
  const todayCost = costData.length > 0
    ? costData[costData.length - 1].opus +
      costData[costData.length - 1].sonnet +
      costData[costData.length - 1].haiku
    : 0;

  const weekCost = costData.reduce(
    (s, d) => s + d.opus + d.sonnet + d.haiku,
    0
  );

  const avgDaily = costData.length > 0 ? weekCost / costData.length : 0;
  const monthCost = avgDaily * 25; // approximate month-to-date
  const projectedMonth = avgDaily * 30;

  // Token count estimate (rough: $1 ~ 66K tokens at opus rates)
  const totalTokensEstimate = weekCost * 66_000;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Equivalent API pricing for your Max5 flat-rate plan ($100/mo)
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <div
            className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
          />
          {isLive ? "Live Data" : "Sample Data"}
        </Badge>
      </div>

      {/* Section A: Cost KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today"
          value={`$${todayCost.toFixed(2)}`}
          subtitle={todayCost < avgDaily ? "below average" : "above average"}
          icon={DollarSign}
          trend={todayCost < avgDaily ? "down" : "up"}
          trendValue={`${Math.abs(((todayCost - avgDaily) / avgDaily) * 100).toFixed(0)}%`}
          accentColor={
            todayCost < avgDaily
              ? "bg-emerald-100 text-emerald-600"
              : "bg-red-100 text-red-600"
          }
        />
        <StatCard
          title="This Week"
          value={`$${weekCost.toFixed(2)}`}
          subtitle={`${costData.length}-day total`}
          icon={Calendar}
          accentColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="This Month"
          value={`$${monthCost.toFixed(2)}`}
          subtitle="estimated to date"
          icon={CreditCard}
          accentColor="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Projected Month"
          value={`$${projectedMonth.toFixed(2)}`}
          subtitle="at current rate"
          icon={TrendingUp}
          trend={projectedMonth > 100 ? "up" : "down"}
          trendValue={
            projectedMonth > 100
              ? `+${((projectedMonth - 100) / 100 * 100).toFixed(0)}%`
              : `${((100 - projectedMonth) / 100 * 100).toFixed(0)}% under`
          }
          accentColor={
            projectedMonth > 100
              ? "bg-red-100 text-red-600"
              : "bg-emerald-100 text-emerald-600"
          }
        />
      </div>

      {/* Section B: Daily Cost by Model - Stacked Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daily Cost by Model (Equivalent API Pricing)
          </CardTitle>
          <CardDescription>
            What your usage would cost at API rates. Your Max5 plan is $100/mo
            flat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v: any) => `$${v}`}
              />
              <Tooltip
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, undefined]}
                labelFormatter={(label: any) => `Date: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="opus"
                name="Opus"
                stackId="cost"
                fill={MODEL_COLORS.opus}
              />
              <Bar
                dataKey="sonnet"
                name="Sonnet"
                stackId="cost"
                fill={MODEL_COLORS.sonnet}
              />
              <Bar
                dataKey="haiku"
                name="Haiku"
                stackId="cost"
                fill={MODEL_COLORS.haiku}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section C: Value Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Value Analysis</CardTitle>
          <CardDescription>
            Max5 plan ($100/mo) vs equivalent API pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-5 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-green-500/20 p-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-500">
                ${projectedMonth.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Equivalent API cost this month
              </div>
              <div className="text-xs text-green-600 mt-2 font-medium">
                {projectedMonth > 100
                  ? `Max5 saves you ~$${(projectedMonth - 100).toFixed(2)}/mo`
                  : `API would be $${(100 - projectedMonth).toFixed(2)}/mo cheaper`}
              </div>
            </div>

            <div className="text-center p-5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {formatNumber(totalTokensEstimate)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Tokens used this week
              </div>
              <div className="text-xs text-blue-600 mt-2 font-medium">
                ~{formatNumber(totalTokensEstimate / (costData.length || 1))}{" "}
                tokens/day average
              </div>
            </div>

            <div className="text-center p-5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-violet-500/20 p-2">
                  <GitCommit className="h-5 w-5 text-violet-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-violet-500">
                ${avgDaily > 0 ? (avgDaily / 14).toFixed(2) : "0.00"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Cost per commit
              </div>
              <div className="text-xs text-violet-600 mt-2 font-medium">
                Based on ~14 commits/day average
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Pricing Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Pricing Reference</CardTitle>
          <CardDescription>
            Per million tokens -- for equivalent API cost calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Model</th>
                  <th className="text-right py-2 font-medium">Input</th>
                  <th className="text-right py-2 font-medium">Output</th>
                  <th className="text-right py-2 font-medium">Cache Read</th>
                  <th className="text-right py-2 font-medium">Cache Create</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODEL_PRICING).map(([model, pricing]) => {
                  const shortName = model.replace("claude-", "");
                  const color =
                    MODEL_COLORS[shortName as keyof typeof MODEL_COLORS] ||
                    "#6B7280";
                  return (
                    <tr
                      key={model}
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {shortName.charAt(0).toUpperCase() +
                            shortName.slice(1)}
                        </div>
                      </td>
                      <td className="text-right py-2.5 font-mono">
                        ${pricing.input}
                      </td>
                      <td className="text-right py-2.5 font-mono">
                        ${pricing.output}
                      </td>
                      <td className="text-right py-2.5 font-mono">
                        ${pricing.cacheRead}
                      </td>
                      <td className="text-right py-2.5 font-mono">
                        ${pricing.cacheCreation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
