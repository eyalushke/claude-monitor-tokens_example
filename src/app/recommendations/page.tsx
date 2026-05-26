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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-7 w-7 text-yellow-500" />
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
      </div>

      {usingFallback && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            Supabase is not connected. Showing recommendations based on sample
            data.
          </span>
        </div>
      )}

      {/* Efficiency Score Card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Efficiency Score
          </div>
          <div className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
            {score}
          </div>
          <div className="w-full max-w-md">
            <Progress value={score} max={100} />
          </div>
          <div className="flex items-center gap-2">
            {score >= 70 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : score >= 40 ? (
              <Info className="h-5 w-5 text-yellow-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-lg font-semibold ${scoreColor}`}>
              {label}
            </span>
          </div>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Based on cache rate (40 pts), model diversity (20 pts), session size
            (20 pts), and tool efficiency (20 pts).
          </p>
        </CardContent>
      </Card>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {recommendations.length} Recommendation
          {recommendations.length !== 1 ? "s" : ""}
        </h2>
        {recommendations.map((rec, index) => (
          <Card
            key={index}
            className={`border-l-4 ${getSeverityBorderColor(rec.severity)}`}
          >
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getSeverityIcon(rec.severity)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-snug">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 capitalize ${
                    rec.severity === "critical"
                      ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                      : rec.severity === "warning"
                        ? "border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400"
                        : "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                  }`}
                >
                  {rec.severity}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {rec.impact}
                </Badge>
                <Link
                  href={rec.link}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
