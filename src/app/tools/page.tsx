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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
import { useDateRange } from "@/hooks/use-date-range";
import type { ToolDailyAggregate } from "@/lib/supabase/types";
// ─── Sample Data ───────────────────────────────────────────────

const SAMPLE_TOOL_DATA = [
  { name: "Read", invocations: 6144, tokens: 485000 },
  { name: "Bash", invocations: 3999, tokens: 380000 },
  { name: "Edit", invocations: 1226, tokens: 186000 },
  { name: "Grep", invocations: 1088, tokens: 154000 },
  { name: "Glob", invocations: 829, tokens: 92000 },
  { name: "Write", invocations: 483, tokens: 172000 },
  { name: "WebSearch", invocations: 249, tokens: 198000 },
  { name: "WebFetch", invocations: 221, tokens: 245000 },
  { name: "Agent", invocations: 199, tokens: 685000 },
  { name: "Skill", invocations: 34, tokens: 67000 },
];

const TOOL_COLORS: Record<string, string> = {
  Read: "#3B82F6",
  Bash: "#8B5CF6",
  Edit: "#10B981",
  Grep: "#F59E0B",
  Glob: "#06B6D4",
  Write: "#EC4899",
  WebSearch: "#EF4444",
  WebFetch: "#F97316",
  Agent: "#6366F1",
  Skill: "#84CC16",
};

// ─── Helpers ───────────────────────────────────────────────────


interface ToolRow {
  name: string;
  invocations: number;
  tokens: number;
}

function aggregateToolData(rows: ToolDailyAggregate[]): ToolRow[] {
  const map = new Map<string, { invocations: number; tokens: number }>();
  for (const r of rows) {
    const existing = map.get(r.tool_name) ?? { invocations: 0, tokens: 0 };
    existing.invocations += r.invocation_count;
    existing.tokens += r.associated_input_tokens + r.associated_output_tokens;
    map.set(r.tool_name, existing);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.tokens - a.tokens);
}

// ─── Dark tooltip style ───────────────────────────────────────
const darkTooltipStyle = {
  background: "#1a1a2e",
  border: "1px solid #333",
  borderRadius: 8,
};

// ─── Page Component ────────────────────────────────────────────

export default function ToolsPage() {
  const { dateStr } = useDateRange();
  const [toolData, setToolData] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setToolData(SAMPLE_TOOL_DATA);
        setIsLive(false);
        setLoading(false);
        return;
      }

      try {
        const { createBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("tool_daily_aggregates")
          .select("*")
          .gte("date", dateStr)
          .order("date", { ascending: false });

        if (error || !data || data.length === 0) {
          setToolData(SAMPLE_TOOL_DATA);
          setIsLive(false);
        } else {
          setToolData(aggregateToolData(data as ToolDailyAggregate[]));
          setIsLive(true);
        }
      } catch {
        setToolData(SAMPLE_TOOL_DATA);
        setIsLive(false);
      }
      setLoading(false);
    }

    fetchData();
  }, [dateStr]);

  const totalTokens = toolData.reduce((s, t) => s + t.tokens, 0);
  const totalInvocations = toolData.reduce((s, t) => s + t.invocations, 0);
  const topTool = toolData[0];

  // Sorted by tokens (descending) for horizontal bar chart
  const tokenChartData = [...toolData].sort((a, b) => b.tokens - a.tokens);

  // Donut chart data: top 5 tools + "Other"
  const top5 = tokenChartData.slice(0, 5);
  const otherTokens = tokenChartData.slice(5).reduce((s, t) => s + t.tokens, 0);
  const donutData = [
    ...top5.map((t) => ({ name: t.name, value: t.tokens, color: TOOL_COLORS[t.name] || "#6B7280" })),
    ...(otherTokens > 0 ? [{ name: "Other", value: otherTokens, color: "#4B5563" }] : []),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tool Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Understand which tools consume your token budget
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <div
            className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
          />
          {isLive ? "Live Data" : "Sample Data"}
        </Badge>
      </div>

      {/* KPI Row - Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tool Tokens */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-violet-400 font-medium mb-2">Total Tool Tokens</div>
            <div className="text-2xl font-bold tabular-nums text-violet-400">{formatNumber(totalTokens)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">across {toolData.length} tools</div>
          </CardContent>
        </Card>

        {/* Total Invocations */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-blue-400 font-medium mb-2">Total Invocations</div>
            <div className="text-2xl font-bold tabular-nums text-blue-400">{formatNumber(totalInvocations)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{topTool ? topTool.name + " is most called" : ""}</div>
          </CardContent>
        </Card>

        {/* Top Tool */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-medium mb-2">Highest Token Tool</div>
            <div className="text-2xl font-bold tabular-nums text-amber-400">{topTool?.name ?? "-"}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {topTool ? formatNumber(topTool.tokens) + " tokens (" + ((topTool.tokens / totalTokens) * 100).toFixed(0) + "%)" : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row: Horizontal Bar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section A: Tool Token Consumption - Horizontal Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Tool Token Consumption</CardTitle>
            <CardDescription className="text-xs">
              Which tools consume the most tokens from your budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={tokenChartData} layout="vertical">
                <defs>
                  {tokenChartData.map((entry) => {
                    const color = TOOL_COLORS[entry.name] || "#8B5CF6";
                    return (
                      <linearGradient key={entry.name} id={`grad-${entry.name}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  fontSize={11}
                  tickFormatter={(v: any) => formatNumber(v)}
                  stroke="#666"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  width={80}
                  stroke="#666"
                />
                <Tooltip
                  contentStyle={darkTooltipStyle}
                  formatter={(value: any) => [
                    formatNumber(Number(value)),
                    "Tokens",
                  ]}
                  labelFormatter={(label: any) => `Tool: ${label}`}
                />
                <Bar
                  dataKey="tokens"
                  name="Associated Tokens"
                  radius={[0, 6, 6, 0]}
                >
                  {tokenChartData.map((entry) => (
                    <Cell key={entry.name} fill={`url(#grad-${entry.name})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Section B: Token Share Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Token Share</CardTitle>
            <CardDescription className="text-xs">
              Top 5 tools by token consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  strokeWidth={2}
                  stroke="#1a1a2e"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={darkTooltipStyle}
                  formatter={(value: any, name: any) => [
                    formatNumber(Number(value)),
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
              {donutData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section C: Ranked Tool List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tool Rankings</CardTitle>
          <CardDescription className="text-xs">
            All tools ranked by token consumption with invocation counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {toolData.map((tool, index) => {
              const pct = totalTokens > 0 ? (tool.tokens / totalTokens) * 100 : 0;
              const color = TOOL_COLORS[tool.name] || "#6B7280";
              return (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xs font-medium text-muted-foreground w-7 text-right tabular-nums">
                    #{index + 1}
                  </span>

                  {/* Color dot + Name */}
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium truncate">{tool.name}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        opacity: 0.8,
                      }}
                    />
                  </div>

                  {/* Percentage */}
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>

                  {/* Token count */}
                  <span className="text-xs font-medium tabular-nums w-16 text-right">
                    {formatNumber(tool.tokens)}
                  </span>

                  {/* Invocation count */}
                  <span className="text-[11px] text-muted-foreground tabular-nums w-20 text-right">
                    {formatNumber(tool.invocations)} calls
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
