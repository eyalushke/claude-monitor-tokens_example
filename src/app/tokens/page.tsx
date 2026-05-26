"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKEN_COLORS, getModelColor, getModelShortName, MODEL_PRICING, getModelPricingKey } from "@/lib/constants";
import { formatNumber, supabaseAvailable } from "@/lib/utils";
import { useDateRange } from "@/hooks/use-date-range";
import type { DailyAggregate } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Sample / fallback data
// ---------------------------------------------------------------------------

const SAMPLE_TOKEN_TYPE_PIE = [
  { name: "Input (uncached)", value: 39400, color: TOKEN_COLORS.input },
  { name: "Output", value: 196700, color: TOKEN_COLORS.output },
  { name: "Cache Read", value: 973000, color: TOKEN_COLORS.cacheRead },
  { name: "Cache Creation", value: 153000, color: TOKEN_COLORS.cacheCreation },
];

const SAMPLE_CACHE_EFFICIENCY = [
  { date: "May 19", rate: 68 },
  { date: "May 20", rate: 71 },
  { date: "May 21", rate: 74 },
  { date: "May 22", rate: 72 },
  { date: "May 23", rate: 76 },
  { date: "May 24", rate: 73 },
  { date: "May 25", rate: 75 },
];

interface ModelRow {
  model: string;
  color: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  total: number;
  pctOfTotal: number;
  cost: number;
}

const SAMPLE_MODEL_TABLE: ModelRow[] = [
  {
    model: "Opus 4.6",
    color: getModelColor("opus"),
    input: 31500,
    output: 157000,
    cacheRead: 778000,
    cacheCreation: 122000,
    total: 1088500,
    pctOfTotal: 80,
    cost: 13.88,
  },
  {
    model: "Sonnet 4.6",
    color: getModelColor("sonnet"),
    input: 5900,
    output: 29500,
    cacheRead: 146000,
    cacheCreation: 23000,
    total: 204400,
    pctOfTotal: 15,
    cost: 0.72,
  },
  {
    model: "Haiku 4.5",
    color: getModelColor("haiku"),
    input: 2000,
    output: 10200,
    cacheRead: 49000,
    cacheCreation: 8000,
    total: 69200,
    pctOfTotal: 5,
    cost: 0.02,
  },
];

const SAMPLE_AVG_CACHE_RATE = 73;
const SAMPLE_WEEKLY_SAVINGS = 12.4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------




// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TokensPage() {
  const { dateStr } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(false);

  const [tokenTypePie, setTokenTypePie] = useState<any[]>([]);
  const [cacheEfficiency, setCacheEfficiency] = useState<any[]>([]);
  const [avgCacheRate, setAvgCacheRate] = useState(0);
  const [weeklySavings, setWeeklySavings] = useState(0);
  const [modelTable, setModelTable] = useState<ModelRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!supabaseAvailable()) {
        applySampleData();
        return;
      }

      try {
        const { createBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserClient();

        const { data: dailyAggs, error } = await supabase
          .from("daily_aggregates")
          .select("*")
          .gte("date", dateStr)
          .order("date", { ascending: true });

        if (error || !dailyAggs || dailyAggs.length === 0) {
          applySampleData();
          return;
        }

        const aggs = dailyAggs as DailyAggregate[];

        // --- Token type pie ---
        let totalInput = 0;
        let totalOutput = 0;
        let totalCacheRead = 0;
        let totalCacheCreation = 0;

        for (const row of aggs) {
          totalInput += row.total_input_tokens;
          totalOutput += row.total_output_tokens;
          totalCacheRead += row.total_cache_read_tokens;
          totalCacheCreation += row.total_cache_creation_tokens;
        }

        setTokenTypePie([
          { name: "Input (uncached)", value: totalInput, color: TOKEN_COLORS.input },
          { name: "Output", value: totalOutput, color: TOKEN_COLORS.output },
          { name: "Cache Read", value: totalCacheRead, color: TOKEN_COLORS.cacheRead },
          { name: "Cache Creation", value: totalCacheCreation, color: TOKEN_COLORS.cacheCreation },
        ]);

        // --- Cache efficiency per day ---
        const dateMap = new Map<string, { cacheRead: number; input: number }>();
        for (const row of aggs) {
          const d = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const existing = dateMap.get(d) ?? { cacheRead: 0, input: 0 };
          existing.cacheRead += row.total_cache_read_tokens;
          existing.input += row.total_input_tokens;
          dateMap.set(d, existing);
        }

        const cacheData: { date: string; rate: number }[] = [];
        let sumRates = 0;
        let rateCount = 0;
        for (const [date, v] of dateMap) {
          const denominator = v.cacheRead + v.input;
          const rate = denominator > 0 ? Math.round((v.cacheRead / denominator) * 100) : 0;
          cacheData.push({ date, rate });
          sumRates += rate;
          rateCount++;
        }
        setCacheEfficiency(cacheData);
        const avgRate = rateCount > 0 ? Math.round(sumRates / rateCount) : 0;
        setAvgCacheRate(avgRate);

        // Estimate weekly savings: difference between uncached cost and cached cost
        const uncachedInputCost = ((totalCacheRead + totalInput) * 15) / 1_000_000; // assume opus pricing for simplicity
        const cachedCost = (totalInput * 15 + totalCacheRead * 1.5) / 1_000_000;
        setWeeklySavings(Math.max(0, uncachedInputCost - cachedCost));

        // --- Model comparison table ---
        const modelMap = new Map<
          string,
          { input: number; output: number; cacheRead: number; cacheCreation: number }
        >();
        for (const row of aggs) {
          const key = getModelShortName(row.model ?? "unknown");
          const existing = modelMap.get(key) ?? { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
          existing.input += row.total_input_tokens;
          existing.output += row.total_output_tokens;
          existing.cacheRead += row.total_cache_read_tokens;
          existing.cacheCreation += row.total_cache_creation_tokens;
          modelMap.set(key, existing);
        }

        const grandTotal = totalInput + totalOutput + totalCacheRead + totalCacheCreation;
        const rows: ModelRow[] = [];
        for (const [model, v] of modelMap) {
          const total = v.input + v.output + v.cacheRead + v.cacheCreation;
          const pricing = MODEL_PRICING[getModelPricingKey(model)];
          const cost =
            (v.input * pricing.input +
              v.output * pricing.output +
              v.cacheRead * pricing.cacheRead +
              v.cacheCreation * pricing.cacheCreation) /
            1_000_000;
          rows.push({
            model,
            color: getModelColor(model.toLowerCase()),
            input: v.input,
            output: v.output,
            cacheRead: v.cacheRead,
            cacheCreation: v.cacheCreation,
            total,
            pctOfTotal: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
            cost,
          });
        }
        rows.sort((a, b) => b.total - a.total);
        setModelTable(rows);

        setUsingSample(false);
      } catch {
        applySampleData();
      } finally {
        setLoading(false);
      }
    }

    function applySampleData() {
      setUsingSample(true);
      setTokenTypePie(SAMPLE_TOKEN_TYPE_PIE);
      setCacheEfficiency(SAMPLE_CACHE_EFFICIENCY);
      setAvgCacheRate(SAMPLE_AVG_CACHE_RATE);
      setWeeklySavings(SAMPLE_WEEKLY_SAVINGS);
      setModelTable(SAMPLE_MODEL_TABLE);
      setLoading(false);
    }

    fetchData();
  }, [dateStr]);

  const totalTokens = tokenTypePie.reduce((s: number, d: any) => s + d.value, 0);

  // Compute composition percentages for the stacked bar
  const compositionSegments = totalTokens > 0
    ? [
        { label: "Input", value: tokenTypePie[0]?.value ?? 0, color: TOKEN_COLORS.input, pct: ((tokenTypePie[0]?.value ?? 0) / totalTokens) * 100 },
        { label: "Output", value: tokenTypePie[1]?.value ?? 0, color: TOKEN_COLORS.output, pct: ((tokenTypePie[1]?.value ?? 0) / totalTokens) * 100 },
        { label: "Cache Read", value: tokenTypePie[2]?.value ?? 0, color: TOKEN_COLORS.cacheRead, pct: ((tokenTypePie[2]?.value ?? 0) / totalTokens) * 100 },
        { label: "Cache Create", value: tokenTypePie[3]?.value ?? 0, color: TOKEN_COLORS.cacheCreation, pct: ((tokenTypePie[3]?.value ?? 0) / totalTokens) * 100 },
      ]
    : [];

  // Output ratio
  const outputTokens = tokenTypePie[1]?.value ?? 0;
  const outputRatio = totalTokens > 0 ? ((outputTokens / totalTokens) * 100).toFixed(1) : "0";

  if (loading) {
    return <LoadingSkeleton />;
  }

  const darkTooltipStyle = { background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 };

  return (
    <div className="space-y-6">
      {usingSample && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Showing sample data. Connect Supabase to see live metrics.
        </div>
      )}

      {/* -- KPI Gradient Cards -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-violet-400 font-medium mb-2">Cache Hit Rate</div>
            <div className="text-2xl font-bold tabular-nums text-violet-400">{avgCacheRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">avg over period</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium mb-2">Est. Savings</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-400">${weeklySavings.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">from cache hits</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-blue-400 font-medium mb-2">Total Tokens</div>
            <div className="text-2xl font-bold tabular-nums text-blue-400">{formatNumber(totalTokens)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">all types combined</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-medium mb-2">Output Ratio</div>
            <div className="text-2xl font-bold tabular-nums text-amber-400">{outputRatio}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">of total tokens</div>
          </CardContent>
        </Card>
      </div>

      {/* -- Token Composition Stacked Bar -- */}
      {compositionSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Token Composition</CardTitle>
            <CardDescription className="text-xs">Breakdown of {formatNumber(totalTokens)} tokens by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {compositionSegments.map((seg, i) => (
                <div
                  key={seg.label}
                  className="h-full transition-all"
                  style={{
                    width: `${seg.pct}%`,
                    backgroundColor: seg.color,
                    borderRadius: i === 0 ? "9999px 0 0 9999px" : i === compositionSegments.length - 1 ? "0 9999px 9999px 0" : undefined,
                  }}
                  title={`${seg.label}: ${formatNumber(seg.value)} (${seg.pct.toFixed(1)}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {compositionSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[11px] text-muted-foreground">
                    {seg.label}: {formatNumber(seg.value)} ({seg.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* -- Token Type Distribution + Cache Efficiency -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Token Type Distribution</CardTitle>
            <CardDescription className="text-xs">Total: {formatNumber(totalTokens)} tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tokenTypePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: any) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  fontSize={10}
                >
                  {tokenTypePie.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => formatNumber(Number(v))}
                  contentStyle={darkTooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cache Efficiency</CardTitle>
            <CardDescription className="text-xs">
              cache_read / (cache_read + input) -- higher is better
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cacheEfficiency}>
                <defs>
                  <linearGradient id="gradCacheRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={10} tick={{ fill: "#94A3B8" }} />
                <YAxis domain={[50, 100]} fontSize={10} tickFormatter={(v: any) => `${v}%`} tick={{ fill: "#94A3B8" }} />
                <Tooltip
                  formatter={(v: any) => `${v}%`}
                  contentStyle={darkTooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  name="Cache Hit Rate"
                  stroke="#10B981"
                  fill="url(#gradCacheRate)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* -- Model Comparison Table -- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Model Token Comparison</CardTitle>
          <CardDescription className="text-xs">Token breakdown and equivalent API cost per model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30">
                  <th className="text-left py-2.5 px-3 font-medium">Model</th>
                  <th className="text-right py-2.5 px-3 font-medium">Input</th>
                  <th className="text-right py-2.5 px-3 font-medium">Output</th>
                  <th className="text-right py-2.5 px-3 font-medium">Cache Read</th>
                  <th className="text-right py-2.5 px-3 font-medium">Cache Create</th>
                  <th className="text-right py-2.5 px-3 font-medium">Total</th>
                  <th className="text-right py-2.5 px-3 font-medium">Share</th>
                  <th className="text-right py-2.5 px-3 font-medium">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelTable.map((row, idx) => (
                  <tr
                    key={row.model}
                    className={`transition-colors hover:bg-muted/60 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="text-xs">{row.model}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{formatNumber(row.input)}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{formatNumber(row.output)}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{formatNumber(row.cacheRead)}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{formatNumber(row.cacheCreation)}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums font-semibold">{formatNumber(row.total)}</td>
                    <td className="text-right py-2.5 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${row.pctOfTotal}%`, backgroundColor: row.color }}
                          />
                        </div>
                        <span className="text-muted-foreground tabular-nums w-8 text-right">{row.pctOfTotal}%</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums">${row.cost.toFixed(2)}</td>
                  </tr>
                ))}
                {modelTable.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                      No model data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-2.5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-6 w-full rounded-full mb-3" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[240px] w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
