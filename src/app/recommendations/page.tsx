"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  generateRecommendations,
  type Recommendation,
  type UsageStats,
} from "@/lib/calculations/recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const sampleStats: UsageStats = {
  totalInputTokens: 1_807_705,
  totalOutputTokens: 11_128_705,
  totalCacheReadTokens: 3_453_221_290,
  totalCacheCreationTokens: 141_663_819,
  totalMessages: 23_611,
  totalSessions: 526,
  toolCounts: {
    Read: 6144,
    Bash: 3999,
    Edit: 1226,
    Grep: 1088,
    Glob: 829,
    Write: 483,
    WebSearch: 249,
    WebFetch: 221,
    Agent: 199,
    Skill: 34,
  },
  modelTokens: {
    "claude-opus-4-5-20251101": 1_089_229,
    "claude-opus-4-6": 14_386,
  },
  subagentSessionCount: 480,
  webSearchCount: 249,
  peakHours: [9, 10, 17],
};

function computeEfficiencyScore(stats: UsageStats): number {
  let score = 0;

  // Cache rate: 40 pts max
  const totalInput = stats.totalInputTokens + stats.totalCacheReadTokens;
  const cacheRate = totalInput > 0 ? stats.totalCacheReadTokens / totalInput : 0;
  score += Math.min(40, Math.round(cacheRate * 50));

  // Model diversity: 20 pts max
  const totalModelTokens = Object.values(stats.modelTokens).reduce(
    (a, b) => a + b,
    0
  );
  const modelCount = Object.keys(stats.modelTokens).length;
  const opusTokens = Object.entries(stats.modelTokens)
    .filter(([k]) => k.includes("opus"))
    .reduce((a, [, v]) => a + v, 0);
  const opusPct =
    totalModelTokens > 0 ? opusTokens / totalModelTokens : 0;
  if (modelCount >= 3 && opusPct < 0.7) {
    score += 20;
  } else if (modelCount >= 2 && opusPct < 0.9) {
    score += 12;
  } else if (modelCount >= 2) {
    score += 6;
  }

  // Session size: 20 pts max
  const avgTokensPerSession =
    stats.totalSessions > 0
      ? (stats.totalInputTokens + stats.totalOutputTokens) / stats.totalSessions
      : 0;
  if (avgTokensPerSession < 20000) {
    score += 20;
  } else if (avgTokensPerSession < 50000) {
    score += 14;
  } else if (avgTokensPerSession < 100000) {
    score += 8;
  } else {
    score += 2;
  }

  // Tool efficiency: 20 pts max
  const totalTools = Object.values(stats.toolCounts).reduce(
    (a, b) => a + b,
    0
  );
  const agentCount = stats.toolCounts["Agent"] || 0;
  const agentPct = totalTools > 0 ? agentCount / totalTools : 0;
  if (agentPct < 0.05) {
    score += 20;
  } else if (agentPct < 0.15) {
    score += 14;
  } else if (agentPct < 0.3) {
    score += 8;
  } else {
    score += 2;
  }

  return Math.min(100, score);
}

function getScoreLabel(score: number): string {
  if (score < 40) return "Needs improvement";
  if (score < 70) return "Good";
  return "Excellent";
}

function getScoreColor(score: number): string {
  if (score < 40) return "text-red-500";
  if (score < 70) return "text-yellow-500";
  return "text-green-500";
}

function getSeverityBorderColor(severity: Recommendation["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-l-red-500";
    case "warning":
      return "border-l-yellow-500";
    case "info":
      return "border-l-blue-500";
  }
}

function getSeverityIcon(severity: Recommendation["severity"]) {
  switch (severity) {
    case "critical":
    case "warning":
      return (
        <AlertTriangle
          className={`h-5 w-5 ${
            severity === "critical" ? "text-red-500" : "text-yellow-500"
          }`}
        />
      );
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

async function fetchUsageStats(): Promise<UsageStats | null> {
  try {
    const supabase = createBrowserClient();

    const [dailyRes, toolRes, sessionRes] = await Promise.all([
      supabase
        .from("daily_aggregates")
        .select(
          "total_input_tokens, total_output_tokens, total_cache_read_tokens, total_cache_creation_tokens, total_messages, model, peak_hours"
        ),
      supabase.from("tool_daily_aggregates").select("tool_name, call_count"),
      supabase
        .from("sessions")
        .select("session_id, is_subagent, total_input_tokens, total_output_tokens"),
    ]);

    if (dailyRes.error || toolRes.error || sessionRes.error) {
      return null;
    }

    const dailyRows = dailyRes.data ?? [];
    const toolRows = toolRes.data ?? [];
    const sessionRows = sessionRes.data ?? [];

    if (dailyRows.length === 0) {
      return null;
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    let totalMessages = 0;
    const modelTokens: Record<string, number> = {};
    const peakHourSet = new Set<number>();

    for (const row of dailyRows) {
      totalInputTokens += row.total_input_tokens ?? 0;
      totalOutputTokens += row.total_output_tokens ?? 0;
      totalCacheReadTokens += row.total_cache_read_tokens ?? 0;
      totalCacheCreationTokens += row.total_cache_creation_tokens ?? 0;
      totalMessages += row.total_messages ?? 0;

      if (row.model) {
        modelTokens[row.model] =
          (modelTokens[row.model] ?? 0) +
          (row.total_input_tokens ?? 0) +
          (row.total_output_tokens ?? 0);
      }

      if (Array.isArray(row.peak_hours)) {
        for (const h of row.peak_hours) {
          peakHourSet.add(h);
        }
      }
    }

    const toolCounts: Record<string, number> = {};
    for (const row of toolRows) {
      toolCounts[row.tool_name] =
        (toolCounts[row.tool_name] ?? 0) + (row.call_count ?? 0);
    }

    const totalSessions = sessionRows.length;
    const subagentSessionCount = sessionRows.filter(
      (s) => s.is_subagent
    ).length;
    const webSearchCount = toolCounts["WebSearch"] ?? 0;

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheCreationTokens,
      totalMessages,
      totalSessions,
      toolCounts,
      modelTokens,
      subagentSessionCount,
      webSearchCount,
      peakHours: Array.from(peakHourSet).sort((a, b) => a - b),
    };
  } catch {
    return null;
  }
}

export default function RecommendationsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const fetched = await fetchUsageStats();
      const usedStats = fetched ?? sampleStats;

      if (!fetched) {
        setUsingFallback(true);
      }

      setStats(usedStats);
      setRecommendations(generateRecommendations(usedStats));
      setScore(computeEfficiencyScore(usedStats));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const label = getScoreLabel(score);
  const scoreColor = getScoreColor(score);

  const scoreGradient = score >= 70
    ? "from-green-500/10 to-green-600/5 border-green-500/20"
    : score >= 40
    ? "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20"
    : "from-red-500/10 to-red-600/5 border-red-500/20";

  const cacheRate = stats ? Math.round((stats.totalCacheReadTokens / (stats.totalCacheReadTokens + stats.totalInputTokens)) * 100) : 0;
  const avgSession = stats ? Math.round((stats.totalInputTokens + stats.totalOutputTokens) / Math.max(1, stats.totalSessions) / 1000) : 0;
  const agentPct = stats ? Math.round(((stats.toolCounts["Agent"] || 0) / Math.max(1, Object.values(stats.toolCounts).reduce((a, b) => a + b, 0))) * 100) : 0;

  return (
    <div className="space-y-5">
      {usingFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Showing recommendations based on sample data. Connect Supabase for real analysis.
        </div>
      )}

      {/* Score + Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Main Score */}
        <Card className={`lg:col-span-2 bg-gradient-to-br ${scoreGradient}`}>
          <CardContent className="pt-5 pb-4 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Efficiency Score</div>
            <div className={`text-6xl font-bold tabular-nums ${scoreColor}`}>{score}</div>
            <Progress value={score} className="h-1.5 mt-3 w-full max-w-[200px]" />
            <div className="flex items-center gap-1.5 mt-2">
              {score >= 70 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : score >= 40 ? <Info className="h-4 w-4 text-yellow-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
              <span className={`text-sm font-semibold ${scoreColor}`}>{label}</span>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown Cards */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-violet-400 font-medium mb-2">Cache Rate</div>
            <div className="text-2xl font-bold tabular-nums text-violet-400">{cacheRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">of 40 pts</div>
            <Progress value={Math.min(100, cacheRate * 1.25)} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-blue-400 font-medium mb-2">Avg Session</div>
            <div className="text-2xl font-bold tabular-nums text-blue-400">{avgSession}K</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">tokens/session</div>
            <Progress value={Math.min(100, 100 - avgSession)} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-medium mb-2">Agent Use</div>
            <div className="text-2xl font-bold tabular-nums text-amber-400">{agentPct}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">of tool calls</div>
            <Progress value={Math.min(100, 100 - agentPct * 3)} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          {recommendations.length} Recommendation{recommendations.length !== 1 ? "s" : ""}
        </h2>
        {recommendations.map((rec, index) => {
          const severityBg = rec.severity === "critical"
            ? "from-red-500/5 to-transparent border-l-red-500"
            : rec.severity === "warning"
            ? "from-yellow-500/5 to-transparent border-l-yellow-500"
            : "from-blue-500/5 to-transparent border-l-blue-500";
          return (
            <Card key={index} className={`border-l-4 bg-gradient-to-r ${severityBg}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">{getSeverityIcon(rec.severity)}</div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                          {rec.impact}
                        </Badge>
                        <Link href={rec.link} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">
                          View details <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[9px] capitalize ${
                    rec.severity === "critical" ? "border-red-500/30 text-red-400"
                    : rec.severity === "warning" ? "border-yellow-500/30 text-yellow-400"
                    : "border-blue-500/30 text-blue-400"
                  }`}>
                    {rec.severity}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
