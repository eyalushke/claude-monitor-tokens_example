export interface Recommendation {
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  impact: string;
  link: string;
}

export interface UsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalMessages: number;
  totalSessions: number;
  toolCounts: Record<string, number>;
  modelTokens: Record<string, number>;
  subagentSessionCount: number;
  webSearchCount: number;
  peakHours: number[];
}

export function generateRecommendations(stats: UsageStats): Recommendation[] {
  const recs: Recommendation[] = [];

  // Cache efficiency
  const totalInput = stats.totalInputTokens + stats.totalCacheReadTokens;
  const cacheRate = totalInput > 0 ? stats.totalCacheReadTokens / totalInput : 0;
  if (cacheRate < 0.5) {
    recs.push({
      severity: "warning",
      title: `Cache hit rate is ${(cacheRate * 100).toFixed(0)}% - below optimal`,
      description: "Structure prompts to reuse context. Keep system prompts consistent across sessions.",
      impact: "Could save 20-40% of input token budget",
      link: "/tokens",
    });
  } else {
    recs.push({
      severity: "info",
      title: `Cache hit rate is ${(cacheRate * 100).toFixed(0)}% - above average`,
      description: "Your prompts are well-structured for context reuse. Cache reads cost ~10% of regular tokens.",
      impact: `Saving significant budget vs uncached`,
      link: "/tokens",
    });
  }

  // Model selection
  const totalModelTokens = Object.values(stats.modelTokens).reduce((a, b) => a + b, 0);
  const opusTokens = Object.entries(stats.modelTokens)
    .filter(([k]) => k.includes("opus"))
    .reduce((a, [, v]) => a + v, 0);
  const opusPct = totalModelTokens > 0 ? opusTokens / totalModelTokens : 0;
  if (opusPct > 0.9) {
    recs.push({
      severity: "critical",
      title: `Opus used for ${(opusPct * 100).toFixed(0)}% of requests`,
      description: "For routine tasks like file reading, simple edits, and grep, Sonnet or Haiku would use fewer tokens.",
      impact: "Equivalent API cost: 5x cheaper with Sonnet",
      link: "/costs",
    });
  }

  // Agent overhead
  const totalTools = Object.values(stats.toolCounts).reduce((a, b) => a + b, 0);
  const agentCount = stats.toolCounts["Agent"] || 0;
  const agentPct = totalTools > 0 ? agentCount / totalTools : 0;
  if (agentPct > 0.15) {
    recs.push({
      severity: "warning",
      title: `Agent tool accounts for ${(agentPct * 100).toFixed(0)}% of tool calls`,
      description: "Each Agent call creates a new context window. Consider breaking complex tasks into focused sessions.",
      impact: "Could save ~30% of daily budget",
      link: "/tools",
    });
  }

  // Session size
  const avgTokensPerSession = stats.totalSessions > 0
    ? (stats.totalInputTokens + stats.totalOutputTokens) / stats.totalSessions
    : 0;
  if (avgTokensPerSession > 50000) {
    recs.push({
      severity: "warning",
      title: "Sessions are very large on average",
      description: `Average ${(avgTokensPerSession / 1000).toFixed(0)}K tokens per session. Smaller, focused sessions are more cache-friendly.`,
      impact: "Better cache efficiency and lower risk of hitting window limits",
      link: "/",
    });
  }

  // Subagent ratio
  if (stats.totalSessions > 0 && stats.subagentSessionCount / stats.totalSessions > 0.5) {
    recs.push({
      severity: "info",
      title: "High subagent usage detected",
      description: "Over 50% of sessions are subagent calls. Review if all delegations are necessary.",
      impact: "Reducing unnecessary subagents saves context window overhead",
      link: "/tools",
    });
  }

  // Web tool usage
  const avgWebPerDay = stats.webSearchCount / Math.max(1, stats.totalSessions / 5);
  if (avgWebPerDay > 10) {
    recs.push({
      severity: "info",
      title: "Frequent web searches detected",
      description: "Web tool calls are token-heavy. Pre-gather documentation into local files when possible.",
      impact: "Could save ~15% of daily budget",
      link: "/tools",
    });
  }

  return recs.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}
