"use client";

import { DateRangeContext, useDateRangeState } from "@/hooks/use-date-range";

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const dateRange = useDateRangeState();
  return <DateRangeContext.Provider value={dateRange}>{children}</DateRangeContext.Provider>;
}
