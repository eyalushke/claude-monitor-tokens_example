# Design System — Claude Monitor Dashboard

Reusable patterns for building dark-themed analytics dashboards with Next.js, Tailwind CSS, shadcn/ui, and Recharts. Copy these patterns into any project.

---

## Stack

- **Next.js 16** + React 19 (App Router, `"use client"` pages)
- **Tailwind CSS 4** with `tw-animate-css`
- **shadcn/ui** components: Card, Badge, Progress, Select, Skeleton, Button, Table, Tabs, Separator
- **Recharts 3** for charts (AreaChart, BarChart, PieChart, RadialBarChart, Treemap)
- **lucide-react** for icons
- **Geist** font family (sans + mono)

---

## Color Palette

### KPI Card Colors (gradient backgrounds)

```
Violet:  from-violet-500/10 to-violet-600/5  border-violet-500/20  text-violet-400
Blue:    from-blue-500/10   to-blue-600/5    border-blue-500/20    text-blue-400
Emerald: from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400
Amber:   from-amber-500/10  to-amber-600/5   border-amber-500/20   text-amber-400
Red:     from-red-500/10    to-red-600/5     border-red-500/20     text-red-400
Green:   from-green-500/10  to-green-600/5   border-green-500/20   text-green-400
```

### Chart Colors

```tsx
const TOKEN_COLORS = {
  input: "#3B82F6",       // blue-500
  output: "#10B981",      // emerald-500
  cacheRead: "#94A3B8",   // slate-400
  cacheCreation: "#F59E0B", // amber-500
};

const PROJECT_COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
];

const MODEL_COLORS = {
  opus: "#8B5CF6",    // violet
  sonnet: "#3B82F6",  // blue
  haiku: "#10B981",   // emerald
};
```

### Severity Colors

```
Critical: red-500, border-l-red-500, from-red-500/5
Warning:  yellow-500, border-l-yellow-500, from-yellow-500/5
Info:     blue-500, border-l-blue-500, from-blue-500/5
Safe:     green-500, border-l-green-500, from-green-500/5
```

---

## KPI Cards

### Gradient KPI Card (primary pattern)

```tsx
<Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
  <CardContent className="pt-4 pb-3">
    <div className="text-[10px] uppercase tracking-wider text-violet-400 font-medium mb-2">
      Label
    </div>
    <div className="text-2xl font-bold tabular-nums text-violet-400">
      Value
    </div>
    <div className="text-[10px] text-muted-foreground mt-0.5">
      subtitle text
    </div>
    {/* Optional: progress bar */}
    <Progress value={62} className="h-1.5 mt-2" />
    {/* Optional: footer with icon */}
    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
      <Timer className="h-3 w-3" />
      Footer detail
    </div>
  </CardContent>
</Card>
```

### Conditional color based on value

```tsx
<Card className={`bg-gradient-to-br ${
  value > threshold
    ? "from-red-500/10 to-red-600/5 border-red-500/20"
    : "from-green-500/10 to-green-600/5 border-green-500/20"
}`}>
  <CardContent className="pt-4 pb-3">
    <div className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${
      value > threshold ? "text-red-400" : "text-green-400"
    }`}>Label</div>
    <div className={`text-2xl font-bold tabular-nums ${
      value > threshold ? "text-red-400" : "text-green-400"
    }`}>{value}</div>
  </CardContent>
</Card>
```

### KPI Grid Layout

```tsx
{/* 5-column on desktop, 2-3 on tablet, stacks on mobile */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
  <Card className="col-span-2 sm:col-span-1 ...">  {/* first card spans 2 on mobile */}
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

---

## Charts

### Dark Tooltip (use on ALL charts)

```tsx
const darkTooltipStyle = {
  background: "#1a1a2e",
  border: "1px solid #333",
  borderRadius: 8,
};

<Tooltip
  contentStyle={darkTooltipStyle}
  formatter={(v: any) => formatNumber(Number(v))}
/>
```

### Area Chart with Gradient Fill

```tsx
<ResponsiveContainer width="100%" height={240}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.6} />
        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
      </linearGradient>
      <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
        <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
    <XAxis dataKey="date" fontSize={10} tick={{ fill: "#888" }} />
    <YAxis fontSize={10} tick={{ fill: "#888" }} tickFormatter={(v) => formatNumber(v)} />
    <Tooltip contentStyle={darkTooltipStyle} />
    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
    <Area type="monotone" dataKey="value1" stackId="1"
      stroke="#3B82F6" fill="url(#gradBlue)" />
    <Area type="monotone" dataKey="value2" stackId="1"
      stroke="#10B981" fill="url(#gradGreen)" />
  </AreaChart>
</ResponsiveContainer>
```

### Stacked Bar Chart

```tsx
<ResponsiveContainer width="100%" height={240}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
    <XAxis dataKey="date" fontSize={10} tick={{ fill: "#888" }} />
    <YAxis fontSize={10} tick={{ fill: "#888" }} tickFormatter={(v) => formatNumber(v)} />
    <Tooltip contentStyle={darkTooltipStyle} />
    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
    <Bar dataKey="categoryA" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
    <Bar dataKey="categoryB" stackId="a" fill="#3B82F6" />
    <Bar dataKey="categoryC" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Donut Pie Chart

```tsx
<ResponsiveContainer width="100%" height={160}>
  <PieChart>
    <Pie data={pieData} dataKey="value" nameKey="name"
      cx="50%" cy="50%" innerRadius={40} outerRadius={65}
      strokeWidth={2} stroke="#1a1a2e">
      {pieData.map((entry, i) => (
        <Cell key={i} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip contentStyle={darkTooltipStyle} />
  </PieChart>
</ResponsiveContainer>
{/* Legend below */}
<div className="flex justify-center gap-4 text-[10px]">
  {pieData.map((entry) => (
    <div key={entry.name} className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
      <span className="text-muted-foreground">{entry.name}</span>
    </div>
  ))}
</div>
```

### Reference Lines (rate limit markers)

```tsx
import { ReferenceLine } from "recharts";

{throttleTimes.map((time) => (
  <ReferenceLine
    key={time}
    x={time.slice(0, 2) + ":00"}
    stroke="#EF4444"
    strokeWidth={2}
    strokeDasharray="4 2"
    label={{
      value: `LIMIT ${time}`,
      position: "top",
      fill: "#EF4444",
      fontSize: 10,
      fontWeight: 600,
    }}
  />
))}
```

### Chart Card Pattern

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Chart Title</CardTitle>
    <CardDescription className="text-xs">Description text</CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={240}>
      {/* chart here */}
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### Two-column chart layout (2:1 ratio)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card className="lg:col-span-2">
    {/* Main chart */}
  </Card>
  <Card>
    {/* Secondary chart (pie, stats, etc.) */}
  </Card>
</div>
```

---

## Ranked List

Show items sorted by a metric with progress bars.

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Top Items</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    {items.map((item, i) => {
      const pct = (item.value / maxValue) * 100;
      return (
        <div key={item.name} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-5 text-right font-mono">
            #{i + 1}
          </span>
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          <span className="text-xs font-medium w-20 truncate">{item.name}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: item.color }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">
            {formatNumber(item.value)}
          </span>
          <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
            {pct.toFixed(0)}%
          </span>
        </div>
      );
    })}
  </CardContent>
</Card>
```

---

## Token Composition Bar

Horizontal stacked bar showing proportions.

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Composition</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="h-4 rounded-full overflow-hidden flex">
      {segments.map((seg) => (
        <div
          key={seg.name}
          className="h-full transition-all"
          style={{ width: `${seg.pct}%`, background: seg.color }}
          title={`${seg.name}: ${seg.pct.toFixed(1)}%`}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-3 mt-2">
      {segments.map((seg) => (
        <div key={seg.name} className="flex items-center gap-1.5 text-[10px]">
          <div className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
          <span className="text-muted-foreground">{seg.name}</span>
          <span className="font-medium tabular-nums">{seg.pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## Severity / Recommendation Cards

```tsx
<Card className={`border-l-4 bg-gradient-to-r ${
  severity === "critical" ? "from-red-500/5 to-transparent border-l-red-500"
  : severity === "warning" ? "from-yellow-500/5 to-transparent border-l-yellow-500"
  : "from-blue-500/5 to-transparent border-l-blue-500"
}`}>
  <CardContent className="py-3 px-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {severity === "info"
            ? <Info className="h-5 w-5 text-blue-500" />
            : <AlertTriangle className={`h-5 w-5 ${severity === "critical" ? "text-red-500" : "text-yellow-500"}`} />
          }
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-snug">Title</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Description</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
              Impact label
            </Badge>
          </div>
        </div>
      </div>
      <Badge variant="outline" className="text-[9px] capitalize border-red-500/30 text-red-400">
        {severity}
      </Badge>
    </div>
  </CardContent>
</Card>
```

---

## Status Badge (external API status)

```tsx
const [status, setStatus] = useState({ indicator: "none", description: "All Systems Operational" });

useEffect(() => {
  fetch("https://status.example.com/api/v2/status.json")
    .then(r => r.json())
    .then(data => setStatus(data.status))
    .catch(() => {});
}, []);

const icon = status.indicator === "none"
  ? <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
  : status.indicator === "minor"
  ? <Shield className="h-3.5 w-3.5 text-yellow-500" />
  : <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;

<Badge variant="outline" className={`gap-1.5 text-[10px] ${
  status.indicator === "none" ? "border-green-500/30 text-green-500"
  : status.indicator === "minor" ? "border-yellow-500/30 text-yellow-500"
  : "border-red-500/30 text-red-500"
}`}>
  {icon}
  {status.description}
</Badge>
```

---

## Date Navigation (prev/next)

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

function navigateDate(dir: number) {
  const d = new Date(selectedDate + "T12:00:00");
  d.setDate(d.getDate() + dir);
  const today = new Date().toISOString().slice(0, 10);
  const newDate = d.toISOString().slice(0, 10);
  if (newDate <= today) setSelectedDate(newDate);
}

<div className="flex items-center gap-1">
  <button onClick={() => navigateDate(-1)}
    className="p-1.5 rounded-md hover:bg-accent transition-colors">
    <ChevronLeft className="h-4 w-4" />
  </button>
  <span className="text-sm font-mono font-medium min-w-[100px] text-center">
    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    })}
  </span>
  <button onClick={() => navigateDate(1)}
    disabled={selectedDate >= new Date().toISOString().slice(0, 10)}
    className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-30">
    <ChevronRight className="h-4 w-4" />
  </button>
</div>
```

---

## Loading Skeleton

```tsx
function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Typography Scale

| Element | Class | Usage |
|---------|-------|-------|
| KPI label | `text-[10px] uppercase tracking-wider font-medium` | Card labels |
| KPI value | `text-2xl font-bold tabular-nums` | Main metric |
| KPI subtitle | `text-[10px] text-muted-foreground` | Supporting text |
| Card title | `text-sm` | Chart/section headers |
| Card description | `text-xs` | Subtitles |
| Table text | `text-xs tabular-nums` | Data rows |
| Badge text | `text-[9px]` or `text-[10px]` | Tags/labels |
| Chart axis | `fontSize: 10, tick: { fill: "#888" }` | Axis labels |
| Chart legend | `iconType: "circle", iconSize: 8, fontSize: 10` | Legend items |

---

## Utility Functions

```tsx
// Format large numbers: 1000 → "1K", 1500000 → "1.5M"
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// Convert UTC ISO timestamp to local HH:MM
function utcToLocalTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Convert UTC ISO timestamp to local hour bucket "HH:00"
function utcToLocalHour(isoTimestamp: string): string {
  return utcToLocalTime(isoTimestamp).slice(0, 2) + ":00";
}
```

---

## Page Structure Template

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // fetch from API/DB
        setData(result);
      } catch {
        setData(SAMPLE_DATA); // graceful fallback
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* gradient cards */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">{/* main chart */}</Card>
        <Card>{/* secondary chart */}</Card>
      </div>

      {/* Table or List */}
      <Card>{/* ranked list or data table */}</Card>
    </div>
  );
}
```

---

Built with Claude Code. Reference implementation: [claude-monitor-tokens](https://github.com/eyalushke/claude-monitor-tokens_example).
