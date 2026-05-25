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
} from "recharts";
import { Wrench, Hash, Percent } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/cards/stat-card";
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

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

// ─── Page Component ────────────────────────────────────────────

export default function ToolsPage() {
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
  }, []);

  const totalTokens = toolData.reduce((s, t) => s + t.tokens, 0);
  const totalInvocations = toolData.reduce((s, t) => s + t.invocations, 0);
  const topTool = toolData[0];

  // Sorted by tokens (descending) for horizontal bar chart
  const tokenChartData = [...toolData].sort((a, b) => b.tokens - a.tokens);
  // Sorted by invocations (descending) for vertical bar chart
  const invocationChartData = [...toolData].sort(
    (a, b) => b.invocations - a.invocations
  );

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

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Tool Tokens"
          value={formatNumber(totalTokens)}
          subtitle={`across ${toolData.length} tools`}
          icon={Wrench}
          accentColor="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="Total Invocations"
          value={formatNumber(totalInvocations)}
          subtitle={`${topTool ? topTool.name + " is most called" : ""}`}
          icon={Hash}
          accentColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Highest Token Tool"
          value={topTool?.name ?? "-"}
          subtitle={`${topTool ? formatNumber(topTool.tokens) + " tokens (" + ((topTool.tokens / totalTokens) * 100).toFixed(0) + "%)" : ""}`}
          icon={Percent}
          accentColor="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Section A: Tool Token Consumption - Horizontal Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Token Consumption</CardTitle>
          <CardDescription>
            Which tools consume the most tokens from your budget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={tokenChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                fontSize={12}
                tickFormatter={(v: any) => formatNumber(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={12}
                width={90}
              />
              <Tooltip
                formatter={(value: any) => [
                  formatNumber(Number(value)),
                  "Tokens",
                ]}
                labelFormatter={(label: any) => `Tool: ${label}`}
              />
              <Bar
                dataKey="tokens"
                name="Associated Tokens"
                radius={[0, 4, 4, 0]}
                fill="#8B5CF6"
              >
                {tokenChartData.map((entry) => {
                  const color = TOOL_COLORS[entry.name] || "#8B5CF6";
                  return (
                    <rect key={entry.name} fill={color} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section B: Tool Detail Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tool Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {toolData.map((tool) => {
            const pct =
              totalTokens > 0
                ? ((tool.tokens / totalTokens) * 100).toFixed(1)
                : "0";
            return (
              <Card key={tool.name}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            TOOL_COLORS[tool.name] || "#6B7280",
                        }}
                      />
                      <span className="font-semibold">{tool.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatNumber(tool.invocations)} calls
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Token share</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={Number(pct)} />
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(tool.tokens)} tokens total
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section C: Tool Invocation Counts - Vertical Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Invocation Counts</CardTitle>
          <CardDescription>
            How frequently each tool is called
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={invocationChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                fontSize={11}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                fontSize={12}
                tickFormatter={(v: any) => formatNumber(v)}
              />
              <Tooltip
                formatter={(value: any) => [
                  Number(value).toLocaleString(),
                  "Invocations",
                ]}
              />
              <Bar
                dataKey="invocations"
                name="Invocations"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
