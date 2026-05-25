"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { FolderOpen, Layers, DollarSign } from "lucide-react";
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
import type { DailyAggregate } from "@/lib/supabase/types";

// ─── Sample Data ───────────────────────────────────────────────

const SAMPLE_PROJECT_DATA = [
  {
    name: "eyal-second-brain-llm",
    tokens: 6_300_000,
    sessions: 42,
    messages: 1840,
    color: "#8B5CF6",
  },
  {
    name: "zadara-finance-eom",
    tokens: 1_400_000,
    sessions: 24,
    messages: 567,
    color: "#3B82F6",
  },
  {
    name: "ba-supabase-log-drain",
    tokens: 685_000,
    sessions: 12,
    messages: 312,
    color: "#10B981",
  },
  {
    name: "family-memories",
    tokens: 590_000,
    sessions: 8,
    messages: 198,
    color: "#F59E0B",
  },
  {
    name: "dlt-pipeline",
    tokens: 344_000,
    sessions: 6,
    messages: 145,
    color: "#EF4444",
  },
  {
    name: "aaystudio-v1",
    tokens: 335_000,
    sessions: 5,
    messages: 134,
    color: "#EC4899",
  },
  {
    name: "family-presentation",
    tokens: 330_000,
    sessions: 4,
    messages: 112,
    color: "#06B6D4",
  },
  {
    name: "family-backup-vault",
    tokens: 310_000,
    sessions: 3,
    messages: 89,
    color: "#84CC16",
  },
];

const PROJECT_COLORS: Record<string, string> = {
  "eyal-second-brain-llm": "#8B5CF6",
  "zadara-finance-eom": "#3B82F6",
  "ba-supabase-log-drain": "#10B981",
  "family-memories": "#F59E0B",
  "dlt-pipeline": "#EF4444",
  "aaystudio-v1": "#EC4899",
  "family-presentation": "#06B6D4",
  "family-backup-vault": "#84CC16",
};

const FALLBACK_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#6366F1",
  "#F97316",
];

// ─── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatCost(tokens: number): string {
  // Rough estimate: average blended cost ~$15/M tokens (Opus-heavy usage)
  const cost = (tokens / 1_000_000) * 15;
  return `$${cost.toFixed(2)}`;
}

interface ProjectRow {
  name: string;
  tokens: number;
  sessions: number;
  messages: number;
  color: string;
}

function aggregateProjects(rows: DailyAggregate[]): ProjectRow[] {
  const map = new Map<
    string,
    { tokens: number; sessions: number; messages: number }
  >();
  for (const r of rows) {
    const name = r.project_name || "unknown";
    const existing = map.get(name) ?? { tokens: 0, sessions: 0, messages: 0 };
    existing.tokens +=
      r.total_input_tokens +
      r.total_output_tokens +
      r.total_cache_read_tokens +
      r.total_cache_creation_tokens;
    existing.sessions += r.session_count;
    existing.messages += r.message_count;
    map.set(name, existing);
  }
  return Array.from(map.entries())
    .map(([name, v], i) => ({
      name,
      ...v,
      color:
        PROJECT_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
    .sort((a, b) => b.tokens - a.tokens);
}

// ─── Custom Treemap Content ────────────────────────────────────

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  color?: string;
  tokens?: number;
}

function CustomTreemapContent({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  color,
  tokens,
}: TreemapContentProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color || "#8B5CF6"}
        rx={6}
        opacity={0.85}
        stroke="#fff"
        strokeWidth={2}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={width < 100 ? 10 : 13}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#ffffffcc"
            fontSize={width < 100 ? 9 : 11}
          >
            {formatNumber(tokens || 0)} tokens
          </text>
        </>
      )}
    </g>
  );
}

// ─── Page Component ────────────────────────────────────────────

export default function ProjectsPage() {
  const [projectData, setProjectData] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setProjectData(SAMPLE_PROJECT_DATA);
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
          .order("date", { ascending: false });

        if (error || !data || data.length === 0) {
          setProjectData(SAMPLE_PROJECT_DATA);
          setIsLive(false);
        } else {
          setProjectData(aggregateProjects(data as DailyAggregate[]));
          setIsLive(true);
        }
      } catch {
        setProjectData(SAMPLE_PROJECT_DATA);
        setIsLive(false);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalTokens = projectData.reduce((s, p) => s + p.tokens, 0);
  const totalSessions = projectData.reduce((s, p) => s + p.sessions, 0);

  // Prepare treemap data with color field
  const treemapData = projectData.map((p) => ({
    name: p.name,
    tokens: p.tokens,
    color: p.color,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Projects Breakdown
          </h1>
          <p className="text-sm text-muted-foreground">
            Token usage distribution across your projects
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
          title="Total Projects"
          value={String(projectData.length)}
          subtitle={`${formatNumber(totalTokens)} total tokens`}
          icon={FolderOpen}
          accentColor="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="Total Sessions"
          value={String(totalSessions)}
          subtitle="across all projects"
          icon={Layers}
          accentColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Est. Total Cost"
          value={formatCost(totalTokens)}
          subtitle="equivalent API pricing"
          icon={DollarSign}
          accentColor="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Section A: Project Token Usage Treemap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Token Usage</CardTitle>
          <CardDescription>
            Size represents relative token consumption per project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={treemapData}
              dataKey="tokens"
              nameKey="name"
              content={<CustomTreemapContent />}
            >
              <Tooltip
                formatter={(value: any) => [
                  formatNumber(Number(value)),
                  "Tokens",
                ]}
              />
            </Treemap>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section B: Project Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Comparison</CardTitle>
          <CardDescription>
            Detailed breakdown of each project&apos;s resource usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Project</th>
                  <th className="text-right py-2 font-medium">Sessions</th>
                  <th className="text-right py-2 font-medium">Messages</th>
                  <th className="text-right py-2 font-medium">Tokens</th>
                  <th className="text-right py-2 font-medium">% of Total</th>
                  <th className="text-right py-2 font-medium">Est. Cost</th>
                  <th className="py-2 font-medium pl-4 w-36">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {projectData.map((proj) => {
                  const pct =
                    totalTokens > 0
                      ? ((proj.tokens / totalTokens) * 100).toFixed(1)
                      : "0";
                  return (
                    <tr
                      key={proj.name}
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="truncate max-w-[200px]">
                            {proj.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2.5">{proj.sessions}</td>
                      <td className="text-right py-2.5">{proj.messages}</td>
                      <td className="text-right py-2.5 font-mono">
                        {formatNumber(proj.tokens)}
                      </td>
                      <td className="text-right py-2.5">{pct}%</td>
                      <td className="text-right py-2.5 font-mono">
                        {formatCost(proj.tokens)}
                      </td>
                      <td className="py-2.5 pl-4 w-36">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: proj.color,
                            }}
                          />
                        </div>
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
