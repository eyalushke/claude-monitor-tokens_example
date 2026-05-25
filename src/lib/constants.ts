export const PLAN_LIMITS = {
  pro: { tokens: 44_000, windowHours: 5, monthlyPrice: 20 },
  max5: { tokens: 88_000, windowHours: 5, monthlyPrice: 100 },
  max20: { tokens: 220_000, windowHours: 5, monthlyPrice: 200 },
} as const;

export const MODEL_COLORS: Record<string, string> = {
  "claude-opus": "#8B5CF6",
  "claude-sonnet": "#3B82F6",
  "claude-haiku": "#10B981",
};

export const MODEL_PRICING = {
  "claude-opus": { input: 15, output: 75, cacheRead: 1.5, cacheCreation: 18.75 },
  "claude-sonnet": { input: 3, output: 15, cacheRead: 0.3, cacheCreation: 3.75 },
  "claude-haiku": { input: 0.25, output: 1.25, cacheRead: 0.025, cacheCreation: 0.3 },
};

// per million tokens

export const TOKEN_COLORS = {
  input: "#3B82F6",
  output: "#10B981",
  cacheRead: "#94A3B8",
  cacheCreation: "#F59E0B",
};

export function getModelColor(modelName: string): string {
  if (modelName.includes("opus")) return MODEL_COLORS["claude-opus"];
  if (modelName.includes("sonnet")) return MODEL_COLORS["claude-sonnet"];
  if (modelName.includes("haiku")) return MODEL_COLORS["claude-haiku"];
  return "#6B7280";
}

export function getModelShortName(modelName: string): string {
  if (modelName.includes("opus")) return "Opus";
  if (modelName.includes("sonnet")) return "Sonnet";
  if (modelName.includes("haiku")) return "Haiku";
  return modelName;
}
