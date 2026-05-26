"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatNumber as formatNum } from "@/lib/utils";
import {
  AlertTriangle, Zap, Clock, TrendingUp, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight,
  Activity, Wrench, FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSyncContext } from "@/components/sync-provider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const WINDOW_HOURS = 5;

interface RateLimitEvent {
  timestamp: string;
  reset_message: string;
  tokens_in_window_input: number;
  tokens_in_window_output: number;
  tokens_in_window_cache_read: number;
  tokens_in_window_cache_create: number;
  messages_in_window: number;
}

interface DayData {
  date: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheCreate: number;
  sessions: number;
  messages: number;
  toolCalls: number;
  projects: string[];
  models: string[];
  wasThrottled: boolean;
  throttleEvents: RateLimitEvent[];
  throttleCount: number;
}

interface HourData {
  hour: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheCreate: number;
  messages: number;
  rollingWindowTokens: number;
  overLimit: boolean;
  tools: Record<string, number>;
  sessions: number;
}

interface SessionDetail {
  sessionId: string;
  projectName: string;
  isSubagent: boolean;
  parentSessionId: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheCreate: number;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  tools: Record<string, number>;
}

interface ThrottleDrilldown {
  event: RateLimitEvent;
  windowStart: string;
  sessions: SessionDetail[];
  totalTokens: number;
  totalMessages: number;
  cumulativeTimeline: Record<string, any>[];
  cumulativeProjects: string[];
}

interface DayDetail {
  date: string;
  hours: HourData[];
  topTools: { name: string; count: number; tokens: number }[];
  topProjects: { name: string; tokens: number }[];
}


function getSeverity(day: DayData): "critical" | "warning" | "safe" {
  if (day.wasThrottled && day.throttleCount >= 2) return "critical";
  if (day.wasThrottled) return "warning";
  return "safe";
}

function getSeverityColor(severity: string): string {
  if (severity === "critical") return "text-red-500";
  if (severity === "warning") return "text-yellow-500";
  return "text-green-500";
}

function getSeverityBg(severity: string): string {
  if (severity === "critical") return "border-l-red-500";
  if (severity === "warning") return "border-l-yellow-500";
  return "border-l-green-500";
}

export default function LimitsPage() {
  const { syncVersion } = useSyncContext();
  const [days, setDays] = useState<DayData[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drilldown, setDrilldown] = useState<ThrottleDrilldown | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hourlyProjectData, setHourlyProjectData] = useState<any[]>([]);
  const [hourlyProjectNames, setHourlyProjectNames] = useState<string[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlySessions, setHourlySessions] = useState(0);
  const [hourlyMessages, setHourlyMessages] = useState(0);
  const [hourlyThrottleTimes, setHourlyThrottleTimes] = useState<string[]>([]);

  async function loadDays() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setDays(sampleDays);
        setLoading(false);
        return;
      }

      const { createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();

      const [{ data: aggs }, { data: rateLimits }] = await Promise.all([
        supabase.from("daily_aggregates").select("*").order("date", { ascending: false }).limit(500),
        supabase.from("rate_limit_events").select("*").order("timestamp", { ascending: false }),
      ]);

      if (!aggs || aggs.length === 0) {
        setDays(sampleDays);
        setLoading(false);
        return;
      }

      const throttlesByDate: Record<string, RateLimitEvent[]> = {};
      for (const rl of (rateLimits || [])) {
        const date = rl.timestamp.slice(0, 10);
        if (!throttlesByDate[date]) throttlesByDate[date] = [];
        throttlesByDate[date].push(rl);
      }

      const byDate: Record<string, any> = {};
      for (const row of aggs) {
        if (!byDate[row.date]) {
          byDate[row.date] = {
            date: row.date,
            totalTokens: 0, inputTokens: 0, outputTokens: 0,
            cacheRead: 0, cacheCreate: 0,
            sessions: 0, messages: 0, toolCalls: 0,
            projects: new Set(), models: new Set(),
          };
        }
        const d = byDate[row.date];
        d.inputTokens += row.total_input_tokens || 0;
        d.outputTokens += row.total_output_tokens || 0;
        d.cacheRead += row.total_cache_read_tokens || 0;
        d.cacheCreate += row.total_cache_creation_tokens || 0;
        d.totalTokens += (row.total_input_tokens || 0) + (row.total_output_tokens || 0);
        d.sessions += row.session_count || 0;
        d.messages += row.message_count || 0;
        d.toolCalls += row.total_tool_calls || 0;
        if (row.project_name) d.projects.add(row.project_name);
        if (row.model) d.models.add(row.model);
      }

      const dayList = Object.values(byDate).map((d: any) => {
        const events = throttlesByDate[d.date] || [];
        return {
          ...d,
          projects: Array.from(d.projects),
          models: Array.from(d.models),
          wasThrottled: events.length > 0,
          throttleEvents: events,
          throttleCount: events.filter((e: any) => e.reset_message).length,
        };
      }) as DayData[];

      dayList.sort((a, b) => b.date.localeCompare(a.date));
      setDays(dayList);
    } catch {
      setDays(sampleDays);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(loadDays, 0);
    return () => clearTimeout(id);
  }, [syncVersion]);

  async function loadHourlyProjects(date: string) {
    setHourlyLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setHourlyProjectData(sampleHourlyProjects);
        setHourlyProjectNames(["eyal-second-brain-llm", "claude-monitor-tokens"]);
        setHourlySessions(12);
        setHourlyMessages(450);
        setHourlyThrottleTimes(["14:54"]);
        setHourlyLoading(false);
        return;
      }

      const { createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();

      const [{ data: messages }, { data: rateLimits }] = await Promise.all([
        supabase
          .from("messages")
          .select("timestamp, input_tokens, output_tokens, session_id")
          .gte("timestamp", `${date}T00:00:00Z`)
          .lte("timestamp", `${date}T23:59:59Z`)
          .order("timestamp", { ascending: true })
          .limit(5000),
        supabase
          .from("rate_limit_events")
          .select("timestamp, reset_message")
          .gte("timestamp", `${date}T00:00:00Z`)
          .lte("timestamp", `${date}T23:59:59Z`)
          .order("timestamp", { ascending: true }),
      ]);

      const throttleTimes = (rateLimits || [])
        .filter((rl: any) => rl.reset_message)
        .map((rl: any) => rl.timestamp.slice(11, 16));
      setHourlyThrottleTimes(throttleTimes);

      if (!messages || messages.length === 0) {
        setHourlyProjectData([]);
        setHourlyProjectNames([]);
        setHourlySessions(0);
        setHourlyMessages(0);
        setHourlyLoading(false);
        return;
      }

      const sessionIds = [...new Set(messages.map((m: any) => m.session_id))];
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, project_name")
        .in("id", sessionIds);

      const sessionProject: Record<string, string> = {};
      for (const s of (sessions || [])) sessionProject[s.id] = s.project_name;

      const projectTotals: Record<string, number> = {};
      const hourProjectBuckets: Record<string, Record<string, number>> = {};

      for (const m of messages) {
        const hour = m.timestamp.slice(11, 13) + ":00";
        const proj = sessionProject[m.session_id] || "unknown";
        const tokens = (m.input_tokens || 0) + (m.output_tokens || 0);
        projectTotals[proj] = (projectTotals[proj] || 0) + tokens;
        if (!hourProjectBuckets[hour]) hourProjectBuckets[hour] = {};
        hourProjectBuckets[hour][proj] = (hourProjectBuckets[hour][proj] || 0) + tokens;
      }

      const topProjects = Object.entries(projectTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name]) => name);

      const hours = Object.keys(hourProjectBuckets).sort();
      const chartData = hours.map((hour) => {
        const entry: any = { hour };
        let otherTotal = 0;
        for (const [proj, tokens] of Object.entries(hourProjectBuckets[hour])) {
          if (topProjects.includes(proj)) {
            entry[proj] = tokens;
          } else {
            otherTotal += tokens;
          }
        }
        for (const proj of topProjects) {
          if (!entry[proj]) entry[proj] = 0;
        }
        if (otherTotal > 0) entry["Other"] = otherTotal;
        return entry;
      });

      setHourlyProjectData(chartData);
      setHourlyProjectNames(topProjects);
      setHourlySessions(sessionIds.length);
      setHourlyMessages(messages.length);
    } catch {
      setHourlyProjectData([]);
      setHourlyProjectNames([]);
    } finally {
      setHourlyLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => loadHourlyProjects(selectedDate), 0);
    return () => clearTimeout(id);
  }, [selectedDate, syncVersion]);

  function navigateDate(dir: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    const today = new Date().toISOString().slice(0, 10);
    const newDate = d.toISOString().slice(0, 10);
    if (newDate <= today) setSelectedDate(newDate);
  }

  async function loadDayDetail(date: string) {
    if (expandedDay === date) {
      setExpandedDay(null);
      setDayDetail(null);
      return;
    }

    setExpandedDay(date);
    setDetailLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setDayDetail(sampleDetail);
        setDetailLoading(false);
        return;
      }

      const { createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();

      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      const { data: messages } = await supabase
        .from("messages")
        .select("timestamp, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, tool_names, tool_count, session_id")
        .gte("timestamp", startOfDay)
        .lte("timestamp", endOfDay)
        .order("timestamp", { ascending: true })
        .limit(5000);

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, project_name")
        .in("id", [...new Set((messages || []).map(m => m.session_id))]);

      const sessionProjectMap: Record<string, string> = {};
      for (const s of (sessions || [])) {
        sessionProjectMap[s.id] = s.project_name;
      }

      if (!messages || messages.length === 0) {
        setDayDetail(sampleDetail);
        setDetailLoading(false);
        return;
      }

      const hourBuckets: Record<string, any> = {};
      const allTokensTimeline: { ts: string; tokens: number }[] = [];
      const toolTotals: Record<string, { count: number; tokens: number }> = {};
      const projectTotals: Record<string, number> = {};

      for (const m of messages) {
        const hourKey = m.timestamp.slice(0, 13);
        const hourLabel = m.timestamp.slice(11, 13) + ":00";
        if (!hourBuckets[hourKey]) {
          hourBuckets[hourKey] = {
            hour: hourKey, label: hourLabel,
            inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreate: 0,
            messages: 0, tools: {} as Record<string, number>,
            sessionSet: new Set(),
          };
        }
        const h = hourBuckets[hourKey];
        h.inputTokens += m.input_tokens || 0;
        h.outputTokens += m.output_tokens || 0;
        h.cacheRead += m.cache_read_tokens || 0;
        h.cacheCreate += m.cache_creation_tokens || 0;
        h.messages += 1;
        h.sessionSet.add(m.session_id);
        for (const t of (m.tool_names || [])) {
          h.tools[t] = (h.tools[t] || 0) + 1;
          if (!toolTotals[t]) toolTotals[t] = { count: 0, tokens: 0 };
          toolTotals[t].count += 1;
          toolTotals[t].tokens += (m.input_tokens || 0) + (m.output_tokens || 0);
        }

        const proj = sessionProjectMap[m.session_id] || "unknown";
        projectTotals[proj] = (projectTotals[proj] || 0) + (m.input_tokens || 0) + (m.output_tokens || 0);

        allTokensTimeline.push({
          ts: m.timestamp,
          tokens: (m.input_tokens || 0) + (m.output_tokens || 0),
        });
      }

      const sortedHours = Object.values(hourBuckets).sort((a: any, b: any) => a.hour.localeCompare(b.hour));

      const hours: HourData[] = sortedHours.map((h: any, idx: number) => {
        let rollingWindowTokens = h.inputTokens + h.outputTokens;
        for (let j = idx - 1; j >= 0 && j >= idx - (WINDOW_HOURS - 1); j--) {
          const prev = sortedHours[j] as any;
          rollingWindowTokens += prev.inputTokens + prev.outputTokens;
        }

        return {
          hour: h.hour,
          label: h.label,
          inputTokens: h.inputTokens,
          outputTokens: h.outputTokens,
          cacheRead: h.cacheRead,
          cacheCreate: h.cacheCreate,
          messages: h.messages,
          rollingWindowTokens,
          overLimit: false,
          tools: h.tools,
          sessions: h.sessionSet.size,
        };
      });

      const topTools = Object.entries(toolTotals)
        .map(([name, v]) => ({ name, count: v.count, tokens: v.tokens }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10);

      const topProjects = Object.entries(projectTotals)
        .map(([name, tokens]) => ({ name, tokens }))
        .sort((a, b) => b.tokens - a.tokens);

      setDayDetail({ date, hours, topTools, topProjects });
    } catch {
      setDayDetail(sampleDetail);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadThrottleDrilldown(event: RateLimitEvent) {
    if (drilldown?.event.timestamp === event.timestamp) {
      setDrilldown(null);
      return;
    }
    setDrilldownLoading(true);
    try {
      const eventTime = new Date(event.timestamp);
      const windowStart = new Date(eventTime.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
      const startISO = windowStart.toISOString();
      const endISO = event.timestamp;

      const { createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();

      const { data: msgs } = await supabase
        .from("messages")
        .select("session_id,timestamp,model,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,tool_names,tool_count")
        .gte("timestamp", startISO)
        .lte("timestamp", endISO)
        .order("timestamp", { ascending: true })
        .limit(5000);

      if (!msgs || msgs.length === 0) { setDrilldownLoading(false); return; }

      const sessionIds = [...new Set(msgs.map((m: any) => m.session_id))];
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id,project_name,is_subagent,parent_session_id")
        .in("id", sessionIds);

      const sessionMap: Record<string, any> = {};
      for (const s of (sessions || [])) sessionMap[s.id] = s;

      const bySession: Record<string, any> = {};
      const projectRunning: Record<string, number> = {};
      const projectTotalTokens: Record<string, number> = {};
      const cumulative: Record<string, any>[] = [];
      let runningTotal = 0;

      for (const m of msgs) {
        const sid = m.session_id;
        if (!bySession[sid]) {
          const sInfo = sessionMap[sid] || {};
          bySession[sid] = {
            sessionId: sid,
            projectName: sInfo.project_name || "unknown",
            isSubagent: sInfo.is_subagent || false,
            parentSessionId: sInfo.parent_session_id || null,
            inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreate: 0,
            messageCount: 0, firstMessage: m.timestamp, lastMessage: m.timestamp,
            tools: {} as Record<string, number>,
          };
        }
        const sd = bySession[sid];
        sd.inputTokens += m.input_tokens || 0;
        sd.outputTokens += m.output_tokens || 0;
        sd.cacheRead += m.cache_read_tokens || 0;
        sd.cacheCreate += m.cache_creation_tokens || 0;
        sd.messageCount += 1;
        if (m.timestamp < sd.firstMessage) sd.firstMessage = m.timestamp;
        if (m.timestamp > sd.lastMessage) sd.lastMessage = m.timestamp;
        for (const t of (m.tool_names || [])) sd.tools[t] = (sd.tools[t] || 0) + 1;

        const proj = sd.projectName;
        const tokens = (m.input_tokens || 0) + (m.output_tokens || 0);
        runningTotal += tokens;
        projectRunning[proj] = (projectRunning[proj] || 0) + tokens;
        projectTotalTokens[proj] = (projectTotalTokens[proj] || 0) + tokens;

        const entry: Record<string, any> = { time: m.timestamp.slice(11, 16) };
        for (const [p, v] of Object.entries(projectRunning)) entry[p] = v;
        cumulative.push(entry);
      }

      const topCumProjects = Object.entries(projectTotalTokens)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name]) => name);

      const sessionList = Object.values(bySession) as SessionDetail[];
      sessionList.sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens));

      const sampled = cumulative.filter((_, i) => i % Math.max(1, Math.floor(cumulative.length / 100)) === 0);
      if (cumulative.length > 0 && sampled[sampled.length - 1] !== cumulative[cumulative.length - 1]) {
        sampled.push(cumulative[cumulative.length - 1]);
      }

      setDrilldown({
        event,
        windowStart: startISO,
        sessions: sessionList,
        totalTokens: runningTotal,
        totalMessages: msgs.length,
        cumulativeTimeline: sampled,
        cumulativeProjects: topCumProjects,
      });
    } catch (e) {
      console.error("Drilldown error:", e);
    } finally {
      setDrilldownLoading(false);
    }
  }

  const totalThrottledDays = days.filter(d => d.wasThrottled).length;
  const totalThrottleEvents = days.reduce((s, d) => s + d.throttleCount, 0);
  const heaviestDay = days.length > 0 ? days.reduce((a, b) => a.totalTokens > b.totalTokens ? a : b) : null;

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalThrottledDays}</div>
                <div className="text-xs text-muted-foreground">Days actually throttled</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-yellow-500/10">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalThrottleEvents}</div>
                <div className="text-xs text-muted-foreground">Total throttle events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{heaviestDay ? formatNum(heaviestDay.totalTokens) : "-"}</div>
                <div className="text-xs text-muted-foreground">Peak day: {heaviestDay?.date || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {days.length > 0 ? formatNum(Math.round(days.reduce((s, d) => s + d.totalTokens, 0) / days.length)) : "-"}
                </div>
                <div className="text-xs text-muted-foreground">Avg daily tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly by Project — navigable by date */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Hourly Token Usage by Project</CardTitle>
              <CardDescription>
                {hourlySessions} sessions, {hourlyMessages} messages
                {days.find(d => d.date === selectedDate)?.wasThrottled && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />Throttled
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Previous day">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-mono font-medium min-w-[100px] text-center">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                onClick={() => navigateDate(1)}
                disabled={selectedDate >= new Date().toISOString().slice(0, 10)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-30"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hourlyLoading ? (
            <div className="h-[280px] bg-muted animate-pulse rounded" />
          ) : hourlyProjectData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data for this date</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyProjectData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v: any) => formatNum(v)} />
                <Tooltip formatter={(v: any) => formatNum(Number(v))} />
                <Legend />
                {hourlyProjectNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="p" fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                ))}
                {hourlyProjectData.some((d: any) => d.Other > 0) && (
                  <Bar dataKey="Other" stackId="p" fill="#6B7280" radius={[2, 2, 0, 0]} />
                )}
                {hourlyThrottleTimes.map((time) => (
                  <ReferenceLine
                    key={time}
                    x={time.slice(0, 2) + ":00"}
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    label={{ value: `LIMIT ${time}`, position: "top", fill: "#EF4444", fontSize: 10, fontWeight: 600 }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Day-by-Day Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Day-by-Day Limit Analysis</CardTitle>
          <CardDescription>Click any day to see hourly breakdown, rolling 5hr window, and which tools/projects consumed the most.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((day) => {
            const severity = getSeverity(day);
            const isExpanded = expandedDay === day.date;
            const maxDayTokens = days.length > 0 ? Math.max(...days.map(d => d.totalTokens)) : 1;
            const pct = Math.min(100, (day.totalTokens / maxDayTokens) * 100);

            return (
              <div key={day.date}>
                <button
                  onClick={() => loadDayDetail(day.date)}
                  className={`w-full text-left rounded-lg border-l-4 p-3 sm:p-4 transition-colors hover:bg-muted/50 ${getSeverityBg(severity)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-mono font-bold">{day.date}</div>
                      {day.wasThrottled ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Throttled ({day.throttleCount}x)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">No throttle</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className={`font-bold text-sm ${getSeverityColor(severity)}`}>{formatNum(day.totalTokens)} tokens</span>
                      <span>{day.sessions} sessions</span>
                      <span>{day.messages} msgs</span>
                      <span>{day.toolCalls} tools</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {day.projects.slice(0, 5).map(p => (
                      <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                    ))}
                  </div>
                </button>

                {/* Expanded Day Detail */}
                {isExpanded && (
                  <div className="ml-4 mt-2 space-y-4 border-l-2 border-border pl-4 pb-4">
                    {detailLoading ? (
                      <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
                    ) : dayDetail ? (
                      <>
                        {/* Throttle Events - clickable for drilldown */}
                        {day.wasThrottled && day.throttleEvents.length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-500">
                              <AlertTriangle className="h-4 w-4" /> Actual Throttle Events
                              <span className="text-[10px] font-normal text-red-400">(click to see full session stack)</span>
                            </h4>
                            <div className="space-y-2">
                              {day.throttleEvents.filter(e => e.reset_message).map((e, i) => {
                                const isActiveDrilldown = drilldown?.event.timestamp === e.timestamp;
                                return (
                                  <div key={i}>
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); loadThrottleDrilldown(e); }}
                                      className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${isActiveDrilldown ? "bg-red-500/20 ring-1 ring-red-500/40" : "hover:bg-red-500/10"}`}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs">
                                        <span className="font-mono font-bold text-red-400">{e.timestamp.slice(11, 16)}</span>
                                        <span className="text-red-300">{e.reset_message}</span>
                                        <span className="text-muted-foreground">
                                          Window: {formatNum(e.tokens_in_window_input + e.tokens_in_window_output)} tok |
                                          Cache: {formatNum(e.tokens_in_window_cache_read)} |
                                          {e.messages_in_window} msgs
                                        </span>
                                        <span className="text-red-400 text-[10px]">{isActiveDrilldown ? "▼ collapse" : "▶ drill down"}</span>
                                      </div>
                                    </button>

                                    {/* === DRILLDOWN PANEL === */}
                                    {isActiveDrilldown && (
                                      <div className="mt-2 ml-2 border-l-2 border-red-500/30 pl-3 space-y-4">
                                        {drilldownLoading ? (
                                          <div className="space-y-2">{[1, 2, 3].map(j => <div key={j} className="h-6 bg-muted animate-pulse rounded" />)}</div>
                                        ) : drilldown ? (
                                          <>
                                            {/* Summary */}
                                            <div className="flex flex-wrap gap-3 text-xs">
                                              <span className="bg-red-500/10 px-2 py-1 rounded font-medium">
                                                {drilldown.sessions.length} sessions in {WINDOW_HOURS}hr window
                                              </span>
                                              <span className="bg-muted px-2 py-1 rounded">
                                                {formatNum(drilldown.totalTokens)} total tokens
                                              </span>
                                              <span className="bg-muted px-2 py-1 rounded">
                                                {drilldown.totalMessages} messages
                                              </span>
                                              <span className="bg-muted px-2 py-1 rounded text-muted-foreground">
                                                Window: {drilldown.windowStart.slice(11, 16)} → {e.timestamp.slice(11, 16)}
                                              </span>
                                            </div>

                                            {/* Cumulative token buildup chart */}
                                            <div>
                                              <h5 className="text-xs font-semibold mb-1">Cumulative Token Buildup by Project → Throttle</h5>
                                              <ResponsiveContainer width="100%" height={180}>
                                                <AreaChart data={drilldown.cumulativeTimeline}>
                                                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                  <XAxis dataKey="time" fontSize={9} />
                                                  <YAxis fontSize={9} tickFormatter={(v: any) => formatNum(v)} />
                                                  <Tooltip formatter={(v: any) => formatNum(Number(v))} />
                                                  <Legend />
                                                  {drilldown.cumulativeProjects.map((proj, i) => (
                                                    <Area key={proj} type="monotone" dataKey={proj} stackId="cum" stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} fillOpacity={0.4} />
                                                  ))}
                                                </AreaChart>
                                              </ResponsiveContainer>
                                            </div>

                                            {/* Session stack table */}
                                            <div>
                                              <h5 className="text-xs font-semibold mb-1">Session Stack (sorted by token consumption)</h5>
                                              <div className="overflow-x-auto">
                                                <table className="w-full text-[11px]">
                                                  <thead>
                                                    <tr className="border-b text-muted-foreground">
                                                      <th className="text-left py-1 font-medium">Type</th>
                                                      <th className="text-left py-1 font-medium">Project</th>
                                                      <th className="text-left py-1 font-medium">Session ID</th>
                                                      <th className="text-right py-1 font-medium">Tokens</th>
                                                      <th className="text-right py-1 font-medium">Cache Read</th>
                                                      <th className="text-right py-1 font-medium">Msgs</th>
                                                      <th className="text-left py-1 font-medium">Active</th>
                                                      <th className="text-left py-1 font-medium pl-2">Top Tools</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {drilldown.sessions.map((s, si) => {
                                                      const total = s.inputTokens + s.outputTokens;
                                                      const pct = drilldown.totalTokens > 0 ? (total / drilldown.totalTokens) * 100 : 0;
                                                      const topTools = Object.entries(s.tools).sort(([, a], [, b]) => b - a).slice(0, 3);
                                                      return (
                                                        <tr key={si} className="border-b border-border/20 hover:bg-muted/30">
                                                          <td className="py-1">
                                                            <Badge variant={s.isSubagent ? "secondary" : "default"} className="text-[9px] px-1 py-0">
                                                              {s.isSubagent ? "sub" : "main"}
                                                            </Badge>
                                                          </td>
                                                          <td className="py-1 font-mono text-[10px] max-w-[120px] truncate">{s.projectName}</td>
                                                          <td className="py-1 font-mono text-[10px] text-muted-foreground max-w-[100px] truncate" title={s.sessionId}>{s.sessionId.slice(0, 12)}...</td>
                                                          <td className="text-right py-1 font-mono">
                                                            <span className="font-bold">{formatNum(total)}</span>
                                                            <span className="text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
                                                          </td>
                                                          <td className="text-right py-1 font-mono text-muted-foreground">{formatNum(s.cacheRead)}</td>
                                                          <td className="text-right py-1">{s.messageCount}</td>
                                                          <td className="py-1 text-muted-foreground">{s.firstMessage.slice(11, 16)}→{s.lastMessage.slice(11, 16)}</td>
                                                          <td className="py-1 pl-2">
                                                            <div className="flex gap-0.5 flex-wrap">
                                                              {topTools.map(([name, count]) => (
                                                                <span key={name} className="text-[9px] bg-muted px-1 py-0.5 rounded">{name}:{count}</span>
                                                              ))}
                                                            </div>
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>

                                            {/* Main session → subagent tree */}
                                            {drilldown.sessions.some(s => s.isSubagent) && (
                                              <div>
                                                <h5 className="text-xs font-semibold mb-1">Session Hierarchy</h5>
                                                <div className="space-y-2">
                                                  {drilldown.sessions.filter(s => !s.isSubagent).map(mainSession => {
                                                    const children = drilldown.sessions.filter(s => s.isSubagent && s.sessionId.startsWith(mainSession.sessionId.slice(0, 36)));
                                                    const mainTotal = mainSession.inputTokens + mainSession.outputTokens;
                                                    const childTotal = children.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0);
                                                    return (
                                                      <div key={mainSession.sessionId} className="bg-muted/30 rounded-lg p-2">
                                                        <div className="flex items-center gap-2 text-xs">
                                                          <Badge variant="default" className="text-[9px] px-1 py-0">main</Badge>
                                                          <span className="font-mono font-medium">{mainSession.projectName}</span>
                                                          <span className="font-mono text-muted-foreground text-[10px]">{mainSession.sessionId.slice(0, 8)}</span>
                                                          <span className="font-bold">{formatNum(mainTotal)}</span>
                                                          <span className="text-muted-foreground">{mainSession.firstMessage.slice(11, 16)}→{mainSession.lastMessage.slice(11, 16)}</span>
                                                        </div>
                                                        {children.length > 0 && (
                                                          <div className="ml-4 mt-1 space-y-0.5 border-l border-border/30 pl-2">
                                                            {children.map((child, ci) => (
                                                              <div key={ci} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <span>└</span>
                                                                <Badge variant="secondary" className="text-[8px] px-1 py-0">sub</Badge>
                                                                <span className="font-mono">{child.sessionId.split("/")[1]?.slice(0, 8) || child.sessionId.slice(0, 8)}</span>
                                                                <span className="font-bold text-foreground">{formatNum(child.inputTokens + child.outputTokens)}</span>
                                                                <span>{child.messageCount} msgs</span>
                                                                <span>{child.firstMessage.slice(11, 16)}→{child.lastMessage.slice(11, 16)}</span>
                                                              </div>
                                                            ))}
                                                            <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border/20">
                                                              Total subagent cost: <span className="font-bold text-foreground">{formatNum(childTotal)}</span> tokens across {children.length} subagents
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Hourly Chart */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Hourly Token Consumption
                          </h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={dayDetail.hours}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis dataKey="label" fontSize={10} />
                              <YAxis fontSize={10} tickFormatter={(v: any) => formatNum(v)} />
                              <Tooltip formatter={(v: any) => formatNum(Number(v))} />
                              <Area type="monotone" dataKey="inputTokens" name="Input" stackId="h" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                              <Area type="monotone" dataKey="outputTokens" name="Output" stackId="h" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                              <Area type="monotone" dataKey="cacheCreate" name="Cache Create" stackId="c" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Hourly Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-1.5 font-medium">Hour</th>
                                <th className="text-right py-1.5 font-medium">In+Out</th>
                                <th className="text-right py-1.5 font-medium">Cache Read</th>
                                <th className="text-right py-1.5 font-medium">Cache Create</th>
                                <th className="text-right py-1.5 font-medium">Msgs</th>
                                <th className="text-left py-1.5 font-medium pl-3">Top Tools</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayDetail.hours.map((h) => {
                                const hourTokens = h.inputTokens + h.outputTokens;
                                const topTools = Object.entries(h.tools).sort(([, a], [, b]) => b - a).slice(0, 3);
                                return (
                                  <tr key={h.hour} className="border-b border-border/30">
                                    <td className="py-1.5 font-mono font-medium">{h.label}</td>
                                    <td className="text-right py-1.5 font-mono">{formatNum(hourTokens)}</td>
                                    <td className="text-right py-1.5 font-mono text-muted-foreground">{formatNum(h.cacheRead)}</td>
                                    <td className="text-right py-1.5 font-mono text-muted-foreground">{formatNum(h.cacheCreate)}</td>
                                    <td className="text-right py-1.5">{h.messages}</td>
                                    <td className="py-1.5 pl-3">
                                      <div className="flex gap-1 flex-wrap">
                                        {topTools.map(([name, count]) => (
                                          <span key={name} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{name}:{count}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <Separator />

                        {/* Culprits: Tools + Projects */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Wrench className="h-4 w-4" /> Token-Heavy Tools
                            </h4>
                            <div className="space-y-1.5">
                              {dayDetail.topTools.slice(0, 8).map((t) => {
                                const totalDayTokens = dayDetail.topTools.reduce((s, x) => s + x.tokens, 0);
                                const pctOfDay = totalDayTokens > 0 ? (t.tokens / totalDayTokens) * 100 : 0;
                                return (
                                  <div key={t.name} className="flex items-center gap-2">
                                    <span className="text-xs font-mono w-24 truncate">{t.name}</span>
                                    <div className="flex-1">
                                      <Progress value={pctOfDay} className="h-1.5" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-16 text-right">{formatNum(t.tokens)}</span>
                                    <span className="text-[10px] text-muted-foreground w-10 text-right">{t.count}x</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <FolderOpen className="h-4 w-4" /> Token-Heavy Projects
                            </h4>
                            <div className="space-y-1.5">
                              {dayDetail.topProjects.map((p) => {
                                const totalDayTokens = dayDetail.topProjects.reduce((s, x) => s + x.tokens, 0);
                                const pctOfDay = totalDayTokens > 0 ? (p.tokens / totalDayTokens) * 100 : 0;
                                return (
                                  <div key={p.name} className="flex items-center gap-2">
                                    <span className="text-xs font-mono w-32 truncate">{p.name}</span>
                                    <div className="flex-1">
                                      <Progress value={pctOfDay} className="h-1.5" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-16 text-right">{formatNum(p.tokens)}</span>
                                    <span className="text-[10px] text-muted-foreground w-10 text-right">{pctOfDay.toFixed(0)}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Actionable Insight */}
                        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" /> Reduction Tips for {day.date}
                          </div>
                          {dayDetail.topTools.length > 0 && dayDetail.topTools[0].tokens > day.totalTokens * 0.3 && (
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">{dayDetail.topTools[0].name}</span> consumed {((dayDetail.topTools[0].tokens / day.totalTokens) * 100).toFixed(0)}% of tokens.
                              {dayDetail.topTools[0].name === "Bash" && " Consider using Read/Grep instead of Bash for file exploration."}
                              {dayDetail.topTools[0].name === "Agent" && " Subagent calls create new context windows. Break complex tasks into focused sessions."}
                              {dayDetail.topTools[0].name === "Edit" && " Multiple small edits accumulate tokens. Batch related changes together."}
                              {dayDetail.topTools[0].name === "Read" && " Large file reads are token-heavy. Use line range limits (offset/limit) when reading."}
                              {dayDetail.topTools[0].name === "WebFetch" && " Web fetches include full page content. Cache documentation locally instead."}
                            </p>
                          )}
                          {day.sessions > 15 && (
                            <p className="text-muted-foreground">
                              {day.sessions} sessions ran this day. Each new session rebuilds context. Fewer, longer sessions with cached context use fewer tokens.
                            </p>
                          )}
                          {dayDetail.hours.filter(h => h.overLimit).length > 3 && (
                            <p className="text-muted-foreground">
                              Limit was exceeded in {dayDetail.hours.filter(h => h.overLimit).length} out of {dayDetail.hours.length} active hours. Spread work across the day with breaks to let the 5hr window reset.
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sample Data ────────────────────────────────────────────

const PROJECT_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"];

const sampleHourlyProjects = [
  { hour: "07:00", "eyal-second-brain-llm": 65000, "claude-monitor-tokens": 12000 },
  { hour: "08:00", "eyal-second-brain-llm": 52000, "claude-monitor-tokens": 8000 },
  { hour: "09:00", "eyal-second-brain-llm": 78000, "claude-monitor-tokens": 0 },
  { hour: "10:00", "eyal-second-brain-llm": 45000, "claude-monitor-tokens": 25000 },
  { hour: "14:00", "eyal-second-brain-llm": 92000, "claude-monitor-tokens": 15000 },
  { hour: "15:00", "eyal-second-brain-llm": 110000, "claude-monitor-tokens": 0 },
];

const sampleDays: DayData[] = [
  { date: "2026-05-24", totalTokens: 920725, inputTokens: 420000, outputTokens: 500725, cacheRead: 390223363, cacheCreate: 28000000, sessions: 36, messages: 2108, toolCalls: 1347, projects: ["eyal-second-brain-llm"], models: ["claude-opus-4-6"], wasThrottled: true, throttleEvents: [{ timestamp: "2026-05-24T14:54:41Z", reset_message: "You've hit your limit - resets 6pm", tokens_in_window_input: 21798, tokens_in_window_output: 371070, tokens_in_window_cache_read: 192355634, tokens_in_window_cache_create: 5282656, messages_in_window: 450 }], throttleCount: 1 },
  { date: "2026-05-25", totalTokens: 260498, inputTokens: 30000, outputTokens: 230498, cacheRead: 52130528, cacheCreate: 5000000, sessions: 14, messages: 577, toolCalls: 365, projects: ["claude-monitor-tokens"], models: ["claude-opus-4-6"], wasThrottled: false, throttleEvents: [], throttleCount: 0 },
  { date: "2026-05-23", totalTokens: 278173, inputTokens: 120000, outputTokens: 158173, cacheRead: 70558610, cacheCreate: 8000000, sessions: 9, messages: 483, toolCalls: 245, projects: ["eyal-second-brain-llm"], models: ["claude-opus-4-6"], wasThrottled: false, throttleEvents: [], throttleCount: 0 },
];

const sampleDetail: DayDetail = {
  date: "2026-05-24",
  hours: [
    { hour: "2026-05-24T07", label: "07:00", inputTokens: 45000, outputTokens: 65000, cacheRead: 42000000, cacheCreate: 3000000, messages: 180, rollingWindowTokens: 110000, overLimit: true, tools: { Read: 45, Bash: 38, Edit: 12 }, sessions: 3 },
    { hour: "2026-05-24T08", label: "08:00", inputTokens: 38000, outputTokens: 52000, cacheRead: 35000000, cacheCreate: 2500000, messages: 150, rollingWindowTokens: 200000, overLimit: true, tools: { Bash: 42, Read: 28, Write: 8 }, sessions: 4 },
  ],
  topTools: [
    { name: "Read", count: 535, tokens: 280000 },
    { name: "Bash", count: 420, tokens: 250000 },
    { name: "Edit", count: 180, tokens: 150000 },
  ],
  topProjects: [
    { name: "eyal-second-brain-llm", tokens: 920725 },
  ],
};
