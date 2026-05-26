"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import { Zap, DollarSign, Monitor, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/stat-card";
import { useDateRange } from "@/hooks/use-date-range";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKEN_COLORS, PLAN_LIMITS, getModelColor, getModelShortName, estimateCost as estimateCostRaw } from "@/lib/constants";
import { formatNumber, supabaseAvailable } from "@/lib/utils";
import type { DailyAggregate } from "@/lib/supabase/types";




const PROJECT_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"];

export default function OverviewPage() {
  const { dateStr } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(false);
  const [gaugePct, setGaugePct] = useState(0);
  const [gaugeUsed, setGaugeUsed] = useState(0);
  const [burnRate, setBurnRate] = useState(0);
  const [costToday, setCostToday] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [messagesToday, setMessagesToday] = useState(0);
  const [toolsToday, setToolsToday] = useState(0);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [projectTimelineData, setProjectTimelineData] = useState<any[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [modelData, setModelData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [throttleDates, setThrottleDates] = useState<Set<string>>(new Set());
  const [throttleCountByDate, setThrottleCountByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      if (!supabaseAvailable()) { applySampleData(); return; }
      try {
        const { createBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserClient();

        const [{ data: dailyAggs, error: aggError }, { data: rateLimits }, { data: recentMessages }] = await Promise.all([
          supabase.from("daily_aggregates").select("*").gte("date", dateStr).order("date", { ascending: true }),
          supabase.from("rate_limit_events").select("timestamp, reset_message").order("timestamp", { ascending: false }),
          supabase.from("messages").select("input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, model, timestamp").gte("timestamp", new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()),
        ]);

        if (aggError || !dailyAggs || dailyAggs.length === 0) { applySampleData(); return; }

        // Throttle dates
        const tDates = new Set<string>();
        const tCounts: Record<string, number> = {};
        for (const rl of (rateLimits || [])) {
          if (rl.reset_message) {
            const d = rl.timestamp.slice(0, 10);
            tDates.add(d);
            tCounts[d] = (tCounts[d] || 0) + 1;
          }
        }
        setThrottleDates(tDates);
        setThrottleCountByDate(tCounts);

        // Gauge
        const windowLimit = PLAN_LIMITS.max5.tokens;
        const recentTokens = (recentMessages ?? []).reduce((sum: number, m: any) => sum + m.input_tokens + m.output_tokens + m.cache_read_tokens + m.cache_creation_tokens, 0);
        setGaugePct(Math.min(100, Math.round((recentTokens / windowLimit) * 100)));
        setGaugeUsed(recentTokens);
        const hoursSinceOldest = recentMessages && recentMessages.length > 0 ? Math.max(1, (Date.now() - new Date(recentMessages[0].timestamp).getTime()) / 3_600_000) : 5;
        setBurnRate(Math.round(recentTokens / hoursSinceOldest));

        // Today's cost + sessions
        const today = new Date().toISOString().split("T")[0];
        const todayAggs = (dailyAggs as DailyAggregate[]).filter((r) => r.date === today);
        setCostToday(todayAggs.reduce((s, r) => s + estimateCostRaw(r.total_input_tokens, r.total_output_tokens, r.total_cache_read_tokens, r.total_cache_creation_tokens, r.model ?? "claude-opus"), 0));
        setSessionsToday(todayAggs.reduce((s, r) => s + r.session_count, 0));
        setMessagesToday(todayAggs.reduce((s, r) => s + r.message_count, 0));
        setToolsToday(todayAggs.reduce((s, r) => s + r.total_tool_calls, 0));

        // Token timeline by type
        const dateMap = new Map<string, { date: string; rawDate: string; input: number; output: number; cacheRead: number; cacheCreation: number }>();
        for (const row of dailyAggs as DailyAggregate[]) {
          const d = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const existing = dateMap.get(d) ?? { date: d, rawDate: row.date, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
          existing.input += row.total_input_tokens;
          existing.output += row.total_output_tokens;
          existing.cacheRead += row.total_cache_read_tokens;
          existing.cacheCreation += row.total_cache_creation_tokens;
          dateMap.set(d, existing);
        }
        setTimelineData(Array.from(dateMap.values()));

        // Project timeline (top 6 projects + "Other")
        const projectDateTotals: Record<string, Record<string, number>> = {};
        const projectTotals: Record<string, number> = {};
        for (const row of dailyAggs as DailyAggregate[]) {
          const d = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const proj = row.project_name || "unknown";
          const tokens = row.total_input_tokens + row.total_output_tokens;
          if (!projectDateTotals[d]) projectDateTotals[d] = {};
          projectDateTotals[d][proj] = (projectDateTotals[d][proj] || 0) + tokens;
          projectTotals[proj] = (projectTotals[proj] || 0) + tokens;
        }
        const topProjects = Object.entries(projectTotals).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name]) => name);
        setProjectNames(topProjects);

        const projTimeline: any[] = [];
        const dates = Array.from(dateMap.keys());
        for (const d of dates) {
          const entry: any = { date: d };
          const dayProjects = projectDateTotals[d] || {};
          let otherTotal = 0;
          for (const [proj, tokens] of Object.entries(dayProjects)) {
            if (topProjects.includes(proj)) {
              entry[proj] = tokens;
            } else {
              otherTotal += tokens;
            }
          }
          for (const proj of topProjects) {
            if (!entry[proj]) entry[proj] = 0;
          }
          entry["Other"] = otherTotal;
          projTimeline.push(entry);
        }
        setProjectTimelineData(projTimeline);

        // Model distribution
        const modelDateMap = new Map<string, Map<string, number>>();
        for (const row of dailyAggs as DailyAggregate[]) {
          const d = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!modelDateMap.has(d)) modelDateMap.set(d, new Map());
          const models = modelDateMap.get(d)!;
          const shortName = getModelShortName(row.model ?? "unknown").toLowerCase();
          const total = row.total_input_tokens + row.total_output_tokens + row.total_cache_read_tokens + row.total_cache_creation_tokens;
          models.set(shortName, (models.get(shortName) ?? 0) + total);
        }
        const modelChartData: any[] = [];
        for (const [date, models] of modelDateMap) {
          const total = Array.from(models.values()).reduce((a, b) => a + b, 0);
          const entry: any = { date };
          for (const [model, tokens] of models) entry[model] = total > 0 ? Math.round((tokens / total) * 100) : 0;
          modelChartData.push(entry);
        }
        setModelData(modelChartData);

        // Recent activity with throttle info
        const activityMap = new Map<string, { rawDate: string; sessions: number; messages: number; tools: number; tokens: number; cost: number }>();
        for (const row of dailyAggs as DailyAggregate[]) {
          const d = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const existing = activityMap.get(d) ?? { rawDate: row.date, sessions: 0, messages: 0, tools: 0, tokens: 0, cost: 0 };
          existing.sessions += row.session_count;
          existing.messages += row.message_count;
          existing.tools += row.total_tool_calls;
          existing.tokens += row.total_input_tokens + row.total_output_tokens;
          existing.cost += estimateCostRaw(row.total_input_tokens, row.total_output_tokens, row.total_cache_read_tokens, row.total_cache_creation_tokens, row.model ?? "claude-opus");
          activityMap.set(d, existing);
        }
        setRecentActivity(
          Array.from(activityMap.entries()).reverse().map(([date, v]) => ({
            date, rawDate: v.rawDate, sessions: v.sessions, messages: v.messages, tools: v.tools,
            tokens: formatNumber(v.tokens), cost: `$${v.cost.toFixed(2)}`,
          }))
        );

        setUsingSample(false);
      } catch { applySampleData(); }
      finally { setLoading(false); }
    }

    function applySampleData() {
      setUsingSample(true);
      setGaugePct(62); setGaugeUsed(54500); setBurnRate(18000); setCostToday(3.07);
      setSessionsToday(7); setMessagesToday(342); setToolsToday(189);
      setTimelineData([
        { date: "May 19", input: 4200, output: 18500, cacheRead: 82000, cacheCreation: 12000 },
        { date: "May 20", input: 5800, output: 31200, cacheRead: 145000, cacheCreation: 28000 },
        { date: "May 21", input: 3100, output: 12800, cacheRead: 61000, cacheCreation: 8500 },
        { date: "May 22", input: 8900, output: 45600, cacheRead: 210000, cacheCreation: 35000 },
        { date: "May 23", input: 6400, output: 28300, cacheRead: 168000, cacheCreation: 22000 },
        { date: "May 24", input: 7200, output: 38900, cacheRead: 195000, cacheCreation: 31000 },
        { date: "May 25", input: 3800, output: 21400, cacheRead: 112000, cacheCreation: 16500 },
      ]);
      setProjectTimelineData([
        { date: "May 19", "eyal-second-brain-llm": 15000, "ba-supabase-log-drain": 3000, Other: 500 },
        { date: "May 20", "eyal-second-brain-llm": 28000, "zadara-finance-eom": 5000, Other: 1200 },
      ]);
      setProjectNames(["eyal-second-brain-llm", "ba-supabase-log-drain"]);
      setModelData([
        { date: "May 22", opus: 91, sonnet: 6, haiku: 3 },
        { date: "May 24", opus: 88, sonnet: 9, haiku: 3 },
        { date: "May 25", opus: 80, sonnet: 14, haiku: 6 },
      ]);
      setRecentActivity([
        { date: "May 25", rawDate: "2026-05-25", sessions: 7, messages: 342, tools: 189, tokens: "153K", cost: "$3.07" },
        { date: "May 24", rawDate: "2026-05-24", sessions: 11, messages: 567, tools: 312, tokens: "272K", cost: "$5.17" },
      ]);
      setThrottleDates(new Set(["2026-05-24", "2026-05-21", "2026-05-20", "2026-05-19"]));
      setThrottleCountByDate({ "2026-05-24": 1, "2026-05-21": 2, "2026-05-20": 3, "2026-05-19": 2 });
      setLoading(false);
    }

    fetchData();
  }, [dateStr]);

  const windowLimit = PLAN_LIMITS.max5.tokens;
  const remaining = Math.max(0, windowLimit - gaugeUsed);
  const gaugeData = [{ name: "usage", value: gaugePct, fill: "#8B5CF6" }];

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {usingSample && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Showing sample data. Connect Supabase to see live metrics.
        </div>
      )}

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
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={gaugeData}>
                    <RadialBar background dataKey="value" cornerRadius={10} max={100} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{gaugePct}%</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">{formatNumber(gaugeUsed)} / {formatNumber(windowLimit)}</div>
                <div className="text-xs text-muted-foreground">~{formatNumber(remaining)} remaining</div>
                <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Rolling window</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard title="Burn Rate" value={`~${formatNumber(burnRate)} tok/hr`} subtitle="last 5 hours" icon={Zap} trend={burnRate > 15000 ? "up" : "down"} trendValue={burnRate > 15000 ? "High" : "Normal"} accentColor="bg-amber-100 text-amber-600" />
        <StatCard title="Today's Est. Cost" value={`$${costToday.toFixed(2)}`} subtitle="equivalent API pricing" icon={DollarSign} accentColor="bg-emerald-100 text-emerald-600" />
        <StatCard title="Sessions Today" value={String(sessionsToday)} subtitle={`${messagesToday} msgs, ${toolsToday} tool calls`} icon={Monitor} accentColor="bg-blue-100 text-blue-600" />
      </div>

      {/* Token Usage by Token Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Usage Timeline (7 days)</CardTitle>
          <CardDescription>Stacked by token type: input, output, cache read, cache creation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: any) => formatNumber(Number(v))} />
              <Tooltip formatter={(value: any) => formatNumber(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="cacheRead" name="Cache Read" stackId="1" stroke={TOKEN_COLORS.cacheRead} fill={TOKEN_COLORS.cacheRead} fillOpacity={0.6} />
              <Area type="monotone" dataKey="cacheCreation" name="Cache Creation" stackId="1" stroke={TOKEN_COLORS.cacheCreation} fill={TOKEN_COLORS.cacheCreation} fillOpacity={0.6} />
              <Area type="monotone" dataKey="output" name="Output" stackId="1" stroke={TOKEN_COLORS.output} fill={TOKEN_COLORS.output} fillOpacity={0.6} />
              <Area type="monotone" dataKey="input" name="Input" stackId="1" stroke={TOKEN_COLORS.input} fill={TOKEN_COLORS.input} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Token Usage by Project */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Usage by Project (7 days)</CardTitle>
          <CardDescription>Input + output tokens broken down by project (top 6 + other)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projectTimelineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: any) => formatNumber(Number(v))} />
              <Tooltip formatter={(value: any) => formatNumber(Number(value))} />
              <Legend />
              {projectNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="p" stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} fillOpacity={0.5} />
              ))}
              <Area type="monotone" dataKey="Other" stackId="p" stroke="#6B7280" fill="#6B7280" fillOpacity={0.3} />
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
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} fontSize={12} tickFormatter={(v: any) => `${v}%`} />
                <YAxis type="category" dataKey="date" fontSize={12} width={60} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend />
                <Bar dataKey="opus" name="Opus" stackId="a" fill={getModelColor("opus")} />
                <Bar dataKey="sonnet" name="Sonnet" stackId="a" fill={getModelColor("sonnet")} />
                <Bar dataKey="haiku" name="Haiku" stackId="a" fill={getModelColor("haiku")} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Daily summary with real throttle events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-center py-2 font-medium">Limit</th>
                    <th className="text-right py-2 font-medium">Sessions</th>
                    <th className="text-right py-2 font-medium">Msgs</th>
                    <th className="text-right py-2 font-medium">Tokens</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row: any) => {
                    const wasThrottled = throttleDates.has(row.rawDate);
                    const count = throttleCountByDate[row.rawDate] || 0;
                    return (
                      <tr key={row.date} className={`border-b border-border/50 hover:bg-muted/50 ${wasThrottled ? "bg-red-500/5" : ""}`}>
                        <td className="py-2 font-medium">{row.date}</td>
                        <td className="text-center py-2">
                          {wasThrottled ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> {count}x
                            </Badge>
                          ) : (
                            <span className="text-green-500 text-xs">OK</span>
                          )}
                        </td>
                        <td className="text-right py-2">{row.sessions}</td>
                        <td className="text-right py-2">{row.messages}</td>
                        <td className="text-right py-2 font-mono">{row.tokens}</td>
                        <td className="text-right py-2 font-mono">{row.cost}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-20" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
      <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
    </div>
  );
}
