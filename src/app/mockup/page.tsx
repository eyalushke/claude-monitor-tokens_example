"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, Treemap,
} from "recharts";
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Activity, Zap, DollarSign, Monitor, Wrench, FolderOpen,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Clock, Cpu, ArrowRight, BarChart3, PieChart as PieIcon, Lightbulb,
  Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// ─── Sample Data ───────────────────────────────────────────────

const COLORS = {
  opus: "#8B5CF6",
  sonnet: "#3B82F6",
  haiku: "#10B981",
  input: "#3B82F6",
  output: "#10B981",
  cacheRead: "#94A3B8",
  cacheCreation: "#F59E0B",
  accent: "#8B5CF6",
  warning: "#F59E0B",
  danger: "#EF4444",
  success: "#10B981",
};

const tokenTimelineData = [
  { date: "May 19", input: 4200, output: 18500, cacheRead: 82000, cacheCreation: 12000 },
  { date: "May 20", input: 5800, output: 31200, cacheRead: 145000, cacheCreation: 28000 },
  { date: "May 21", input: 3100, output: 12800, cacheRead: 61000, cacheCreation: 8500 },
  { date: "May 22", input: 8900, output: 45600, cacheRead: 210000, cacheCreation: 35000 },
  { date: "May 23", input: 6400, output: 28300, cacheRead: 168000, cacheCreation: 22000 },
  { date: "May 24", input: 7200, output: 38900, cacheRead: 195000, cacheCreation: 31000 },
  { date: "May 25", input: 3800, output: 21400, cacheRead: 112000, cacheCreation: 16500 },
];

const modelBreakdownData = [
  { date: "May 19", opus: 78, sonnet: 15, haiku: 7 },
  { date: "May 20", opus: 82, sonnet: 12, haiku: 6 },
  { date: "May 21", opus: 65, sonnet: 28, haiku: 7 },
  { date: "May 22", opus: 91, sonnet: 6, haiku: 3 },
  { date: "May 23", opus: 74, sonnet: 18, haiku: 8 },
  { date: "May 24", opus: 88, sonnet: 9, haiku: 3 },
  { date: "May 25", opus: 80, sonnet: 14, haiku: 6 },
];

const toolUsageData = [
  { name: "Agent", count: 342, tokens: 485000, pct: 38 },
  { name: "Read", count: 891, tokens: 120000, pct: 9.5 },
  { name: "Bash", count: 567, tokens: 98000, pct: 7.8 },
  { name: "Edit", count: 423, tokens: 86000, pct: 6.8 },
  { name: "Write", count: 234, tokens: 72000, pct: 5.7 },
  { name: "Grep", count: 678, tokens: 54000, pct: 4.3 },
  { name: "Glob", count: 445, tokens: 32000, pct: 2.5 },
  { name: "WebFetch", count: 89, tokens: 145000, pct: 11.5 },
  { name: "WebSearch", count: 56, tokens: 98000, pct: 7.8 },
  { name: "Skill", count: 34, tokens: 67000, pct: 5.3 },
];

const projectData = [
  { name: "Zadara-Finance-EoM", tokens: 485000, sessions: 24, color: "#8B5CF6" },
  { name: "zadara-revenue-kpis", tokens: 210000, sessions: 12, color: "#3B82F6" },
  { name: "family-memories", tokens: 180000, sessions: 8, color: "#10B981" },
  { name: "ba-supabase-log-drain", tokens: 125000, sessions: 6, color: "#F59E0B" },
  { name: "eyal-second-brain-llm", tokens: 98000, sessions: 5, color: "#EF4444" },
  { name: "claude-monitor-tokens", tokens: 72000, sessions: 3, color: "#EC4899" },
  { name: "family-presentation", tokens: 45000, sessions: 2, color: "#06B6D4" },
  { name: "dlt-pipeline", tokens: 32000, sessions: 2, color: "#84CC16" },
];

const costDailyData = [
  { date: "May 19", opus: 2.85, sonnet: 0.42, haiku: 0.08 },
  { date: "May 20", opus: 4.12, sonnet: 0.31, haiku: 0.05 },
  { date: "May 21", opus: 1.95, sonnet: 0.78, haiku: 0.06 },
  { date: "May 22", opus: 5.67, sonnet: 0.18, haiku: 0.03 },
  { date: "May 23", opus: 3.42, sonnet: 0.52, haiku: 0.07 },
  { date: "May 24", opus: 4.88, sonnet: 0.25, haiku: 0.04 },
  { date: "May 25", opus: 2.64, sonnet: 0.38, haiku: 0.05 },
];

const recentActivity = [
  { date: "May 25", sessions: 7, messages: 342, tools: 189, tokens: "153K", cost: "$3.07" },
  { date: "May 24", sessions: 11, messages: 567, tools: 312, tokens: "272K", cost: "$5.17" },
  { date: "May 23", sessions: 9, messages: 445, tools: 245, tokens: "225K", cost: "$4.01" },
  { date: "May 22", sessions: 14, messages: 689, tools: 398, tokens: "300K", cost: "$5.88" },
  { date: "May 21", sessions: 5, messages: 198, tools: 112, tokens: "85K", cost: "$2.79" },
  { date: "May 20", sessions: 12, messages: 534, tools: 298, tokens: "210K", cost: "$4.48" },
  { date: "May 19", sessions: 8, messages: 356, tools: 201, tokens: "117K", cost: "$3.35" },
];

const tokenTypePieData = [
  { name: "Input (uncached)", value: 39400, color: COLORS.input },
  { name: "Output", value: 196700, color: COLORS.output },
  { name: "Cache Read", value: 973000, color: COLORS.cacheRead },
  { name: "Cache Creation", value: 153000, color: COLORS.cacheCreation },
];

const cacheEfficiencyData = [
  { date: "May 19", rate: 68 },
  { date: "May 20", rate: 71 },
  { date: "May 21", rate: 74 },
  { date: "May 22", rate: 72 },
  { date: "May 23", rate: 76 },
  { date: "May 24", rate: 73 },
  { date: "May 25", rate: 75 },
];

const windowGaugeData = [{ name: "usage", value: 62, fill: COLORS.accent }];

const recommendations = [
  {
    severity: "info" as const,
    title: "Cache hit rate is 73% - above average",
    description: "Your prompts are well-structured for context reuse. Cache reads cost ~10% of regular input tokens, saving you significant budget.",
    impact: "Saving ~$12.40/week vs uncached",
    link: "/tokens",
  },
  {
    severity: "warning" as const,
    title: "Agent tool consumes 38% of total tokens",
    description: "Subagent delegations are your biggest token consumer. Each Agent call creates a new context window. Consider breaking complex tasks into smaller, focused sessions instead of deep agent chains.",
    impact: "Could save ~30% of daily budget",
    link: "/tools",
  },
  {
    severity: "warning" as const,
    title: "Peak usage between 2-4 PM risks window limits",
    description: "Your heaviest usage is concentrated in afternoon hours. The 5-hour rolling window means a burst of activity can lock you out. Try spreading intensive work across the day.",
    impact: "Reduce lockout frequency by ~50%",
    link: "/",
  },
  {
    severity: "critical" as const,
    title: "Opus used for 80% of requests",
    description: "Claude Opus is the most capable but also most expensive model. For routine tasks like file reading, simple edits, and grep operations, Sonnet or Haiku would use fewer tokens from your budget.",
    impact: "Equivalent API cost: 5x cheaper with Sonnet",
    link: "/costs",
  },
  {
    severity: "info" as const,
    title: "WebFetch/WebSearch use 19% of tokens",
    description: "Web tool calls are token-heavy because they include fetched content in context. Pre-gather documentation into local files when possible, or use more targeted search queries.",
    impact: "Could save ~15% of daily budget",
    link: "/tools",
  },
];

// ─── Helper Components ─────────────────────────────────────────

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, accentColor }: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; trend?: "up" | "down"; trendValue?: string;
  accentColor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg p-2" style={{ backgroundColor: `${accentColor || COLORS.accent}15` }}>
          <Icon className="h-4 w-4" style={{ color: accentColor || COLORS.accent }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend === "up" ? "text-red-500" : "text-green-500"}`}>
              {trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trendValue}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: "info" | "warning" | "critical" }) {
  if (severity === "critical") return <AlertTriangle className="h-5 w-5 text-red-500" />;
  if (severity === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  return <Info className="h-5 w-5 text-blue-500" />;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── Custom Treemap Content ─────────────────────────────────────

interface TreemapContentProps {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; color?: string; tokens?: number;
}

function CustomTreemapContent({ x = 0, y = 0, width = 0, height = 0, name, color, tokens }: TreemapContentProps) {
  if (width < 60 || height < 40) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={6} opacity={0.85} stroke="#fff" strokeWidth={2} />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={width < 100 ? 10 : 13} fontWeight="bold">
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#ffffffcc" fontSize={width < 100 ? 9 : 11}>
        {formatNumber(tokens || 0)} tokens
      </text>
    </g>
  );
}

// ─── Main Mockup Page ──────────────────────────────────────────

export default function MockupPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">Claude Code Monitor</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Token Usage Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden sm:inline">Live</span> Mockup
            </Badge>
            <div className="text-right text-xs text-muted-foreground hidden sm:block">
              <div>Max5 Plan</div>
              <div>Last sync: 2 min ago</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── Navigation Tabs ── */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-7 h-10 min-w-max sm:min-w-0">
              <TabsTrigger value="overview" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><BarChart3 className="h-3.5 w-3.5 shrink-0" /><span className="hidden sm:inline">Overview</span><span className="sm:hidden">Home</span></TabsTrigger>
              <TabsTrigger value="tokens" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><Cpu className="h-3.5 w-3.5 shrink-0" /> Tokens</TabsTrigger>
              <TabsTrigger value="tools" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><Wrench className="h-3.5 w-3.5 shrink-0" /> Tools</TabsTrigger>
              <TabsTrigger value="projects" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><FolderOpen className="h-3.5 w-3.5 shrink-0" /><span className="hidden sm:inline">Projects</span><span className="sm:hidden">Proj</span></TabsTrigger>
              <TabsTrigger value="costs" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><DollarSign className="h-3.5 w-3.5 shrink-0" /> Costs</TabsTrigger>
              <TabsTrigger value="recommendations" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><Lightbulb className="h-3.5 w-3.5 shrink-0" /> Tips</TabsTrigger>
              <TabsTrigger value="all" className="gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3"><PieIcon className="h-3.5 w-3.5 shrink-0" /> All</TabsTrigger>
            </TabsList>
          </div>

          {/* ════════════════════════════════════════════════════════
              OVERVIEW TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <OverviewSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              TOKENS TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="tokens" className="space-y-6 mt-6">
            <TokensSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              TOOLS TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="tools" className="space-y-6 mt-6">
            <ToolsSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              PROJECTS TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="projects" className="space-y-6 mt-6">
            <ProjectsSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              COSTS TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="costs" className="space-y-6 mt-6">
            <CostsSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              RECOMMENDATIONS TAB
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="recommendations" className="space-y-6 mt-6">
            <RecommendationsSection />
          </TabsContent>

          {/* ════════════════════════════════════════════════════════
              ALL SECTIONS (scrollable view of everything)
             ════════════════════════════════════════════════════════ */}
          <TabsContent value="all" className="space-y-10 mt-6">
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Overview</h2>
              <OverviewSection />
            </section>
            <Separator />
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Cpu className="h-5 w-5" /> Token Breakdown</h2>
              <TokensSection />
            </section>
            <Separator />
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Wrench className="h-5 w-5" /> Tool Analysis</h2>
              <ToolsSection />
            </section>
            <Separator />
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Projects</h2>
              <ProjectsSection />
            </section>
            <Separator />
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5" /> Cost Analysis</h2>
              <CostsSection />
            </section>
            <Separator />
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Recommendations</h2>
              <RecommendationsSection />
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Section Components ────────────────────────────────────────

function OverviewSection() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">5hr Window Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                    startAngle={90} endAngle={-270} data={windowGaugeData}
                  >
                    <RadialBar background dataKey="value" cornerRadius={10} max={100} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">62%</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">54.5K / 88K</div>
                <div className="text-xs text-muted-foreground">~33.5K remaining</div>
                <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Resets in ~2h 15m
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatCard
          title="Burn Rate"
          value="~18K tok/hr"
          subtitle="vs 15K yesterday"
          icon={Zap}
          trend="up"
          trendValue="+20%"
          accentColor={COLORS.warning}
        />
        <StatCard
          title="Today's Est. Cost"
          value="$3.07"
          subtitle="7-day avg: $3.96"
          icon={DollarSign}
          trend="down"
          trendValue="-22%"
          accentColor={COLORS.success}
        />
        <StatCard
          title="Sessions Today"
          value="7"
          subtitle="342 messages, 189 tool calls"
          icon={Monitor}
          accentColor={COLORS.input}
        />
      </div>

      {/* Token Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Usage Timeline (7 days)</CardTitle>
          <CardDescription>Stacked by token type: input, output, cache read, cache creation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={tokenTimelineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip formatter={(value: any) => formatNumber(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="cacheRead" name="Cache Read" stackId="1" stroke={COLORS.cacheRead} fill={COLORS.cacheRead} fillOpacity={0.6} />
              <Area type="monotone" dataKey="cacheCreation" name="Cache Creation" stackId="1" stroke={COLORS.cacheCreation} fill={COLORS.cacheCreation} fillOpacity={0.6} />
              <Area type="monotone" dataKey="output" name="Output" stackId="1" stroke={COLORS.output} fill={COLORS.output} fillOpacity={0.6} />
              <Area type="monotone" dataKey="input" name="Input" stackId="1" stroke={COLORS.input} fill={COLORS.input} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Model Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Distribution (%)</CardTitle>
            <CardDescription>Token allocation across models per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelBreakdownData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} fontSize={12} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="date" fontSize={12} width={60} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend />
                <Bar dataKey="opus" name="Opus" stackId="a" fill={COLORS.opus} radius={[0, 0, 0, 0]} />
                <Bar dataKey="sonnet" name="Sonnet" stackId="a" fill={COLORS.sonnet} />
                <Bar dataKey="haiku" name="Haiku" stackId="a" fill={COLORS.haiku} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Daily summary for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-right py-2 font-medium">Sessions</th>
                    <th className="text-right py-2 font-medium">Messages</th>
                    <th className="text-right py-2 font-medium">Tools</th>
                    <th className="text-right py-2 font-medium">Tokens</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr key={row.date} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 font-medium">{row.date}</td>
                      <td className="text-right py-2">{row.sessions}</td>
                      <td className="text-right py-2">{row.messages}</td>
                      <td className="text-right py-2">{row.tools}</td>
                      <td className="text-right py-2 font-mono">{row.tokens}</td>
                      <td className="text-right py-2 font-mono">{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TokensSection() {
  return (
    <div className="space-y-6">
      {/* Token Type Distribution + Cache Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token Type Distribution (7 days)</CardTitle>
            <CardDescription>Total: 1.36M tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tokenTypePieData} cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110} paddingAngle={3}
                  dataKey="value" label={({ name, percent }: any) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {tokenTypePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cache Efficiency</CardTitle>
            <CardDescription>Cache hit rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-green-500">73%</div>
                <div className="text-xs text-muted-foreground">Avg Cache Hit Rate</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-500">$12.40</div>
                <div className="text-xs text-muted-foreground">Est. Weekly Savings</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={cacheEfficiencyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis domain={[50, 100]} fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Area type="monotone" dataKey="rate" name="Cache Hit Rate" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Token Comparison</CardTitle>
          <CardDescription>Daily token consumption by model</CardDescription>
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
                  <th className="text-right py-2 font-medium">Total</th>
                  <th className="text-right py-2 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.opus }} /> Opus 4.6
                  </td>
                  <td className="text-right py-2 font-mono">31.5K</td>
                  <td className="text-right py-2 font-mono">157K</td>
                  <td className="text-right py-2 font-mono">778K</td>
                  <td className="text-right py-2 font-mono">122K</td>
                  <td className="text-right py-2 font-mono font-bold">1.09M</td>
                  <td className="text-right py-2">80%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.sonnet }} /> Sonnet 4.6
                  </td>
                  <td className="text-right py-2 font-mono">5.9K</td>
                  <td className="text-right py-2 font-mono">29.5K</td>
                  <td className="text-right py-2 font-mono">146K</td>
                  <td className="text-right py-2 font-mono">23K</td>
                  <td className="text-right py-2 font-mono font-bold">204K</td>
                  <td className="text-right py-2">15%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.haiku }} /> Haiku 4.5
                  </td>
                  <td className="text-right py-2 font-mono">2K</td>
                  <td className="text-right py-2 font-mono">10.2K</td>
                  <td className="text-right py-2 font-mono">49K</td>
                  <td className="text-right py-2 font-mono">8K</td>
                  <td className="text-right py-2 font-mono font-bold">69.2K</td>
                  <td className="text-right py-2">5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolsSection() {
  return (
    <div className="space-y-6">
      {/* Tool Usage Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Token Consumption (7 days)</CardTitle>
          <CardDescription>Which tools consume the most tokens from your budget</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={toolUsageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
              <YAxis type="category" dataKey="name" fontSize={12} width={80} />
              <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
              <Bar dataKey="tokens" name="Associated Tokens" fill={COLORS.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tool Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {toolUsageData.slice(0, 6).map((tool) => (
          <Card key={tool.name}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{tool.name}</span>
                <Badge variant="outline">{tool.count} calls</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Token share</span>
                  <span>{tool.pct}%</span>
                </div>
                <Progress value={tool.pct * 2.5} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  ~{formatNumber(tool.tokens)} tokens total
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tool Invocation Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Invocation Counts</CardTitle>
          <CardDescription>How frequently each tool is called</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={toolUsageData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={60} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" name="Invocations" fill={COLORS.sonnet} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectsSection() {
  const totalTokens = projectData.reduce((s, p) => s + p.tokens, 0);
  return (
    <div className="space-y-6">
      {/* Treemap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Usage by Project</CardTitle>
          <CardDescription>Size represents relative token consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={projectData} dataKey="tokens" nameKey="name"
              content={<CustomTreemapContent />}
            />
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Project Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Project</th>
                  <th className="text-right py-2 font-medium">Sessions</th>
                  <th className="text-right py-2 font-medium">Tokens</th>
                  <th className="text-right py-2 font-medium">% of Total</th>
                  <th className="text-right py-2 font-medium">Est. Cost</th>
                  <th className="py-2 font-medium pl-4">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {projectData.map((proj) => {
                  const pct = ((proj.tokens / totalTokens) * 100).toFixed(1);
                  return (
                    <tr key={proj.name} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2.5 font-medium flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: proj.color }} />
                        {proj.name}
                      </td>
                      <td className="text-right py-2.5">{proj.sessions}</td>
                      <td className="text-right py-2.5 font-mono">{formatNumber(proj.tokens)}</td>
                      <td className="text-right py-2.5">{pct}%</td>
                      <td className="text-right py-2.5 font-mono">
                        ${((proj.tokens / 1000) * 0.015).toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-4 w-32">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: proj.color }}
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

function CostsSection() {
  return (
    <div className="space-y-6">
      {/* Cost KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today" value="$3.07" subtitle="below average" icon={DollarSign} trend="down" trendValue="-22%" accentColor={COLORS.success} />
        <StatCard title="This Week" value="$28.75" subtitle="7-day total" icon={DollarSign} accentColor={COLORS.input} />
        <StatCard title="This Month" value="$89.42" subtitle="25 days in" icon={DollarSign} accentColor={COLORS.warning} />
        <StatCard title="Projected Month" value="$107.30" subtitle="at current rate" icon={TrendingUp} trend="up" trendValue="+7%" accentColor={COLORS.danger} />
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Cost by Model (Equivalent API Pricing)</CardTitle>
          <CardDescription>What your usage would cost at API rates -- your Max5 plan is $100/mo flat</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costDailyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="opus" name="Opus" stackId="a" fill={COLORS.opus} radius={[0, 0, 0, 0]} />
              <Bar dataKey="sonnet" name="Sonnet" stackId="a" fill={COLORS.sonnet} />
              <Bar dataKey="haiku" name="Haiku" stackId="a" fill={COLORS.haiku} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Value Analysis</CardTitle>
          <CardDescription>Max5 plan ($100/mo) vs API pricing equivalent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">$107.30</div>
              <div className="text-sm text-muted-foreground mt-1">Equivalent API cost this month</div>
              <div className="text-xs text-green-500 mt-2">Max5 saves you ~$7.30/mo at current usage</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-500">1.36M</div>
              <div className="text-sm text-muted-foreground mt-1">Tokens used this week</div>
              <div className="text-xs text-blue-500 mt-2">~194K tokens/day average</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="text-2xl font-bold text-violet-500">$0.22</div>
              <div className="text-sm text-muted-foreground mt-1">Cost per commit</div>
              <div className="text-xs text-violet-500 mt-2">Based on 14 commits today</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsSection() {
  return (
    <div className="space-y-6">
      {/* Efficiency Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Efficiency Score</h3>
              <p className="text-sm text-muted-foreground">Based on cache usage, model selection, and tool efficiency</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-green-500">72</div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={72} className="h-3" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Needs improvement</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <Card key={i} className={`border-l-4 ${
            rec.severity === "critical" ? "border-l-red-500" :
            rec.severity === "warning" ? "border-l-yellow-500" : "border-l-blue-500"
          }`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <SeverityIcon severity={rec.severity} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant={rec.severity === "critical" ? "destructive" : "outline"} className="text-xs">
                      {rec.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded">
                      {rec.impact}
                    </span>
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      View details <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
