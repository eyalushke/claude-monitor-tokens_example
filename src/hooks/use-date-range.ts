"use client";

import { createContext, useContext, useState, useMemo } from "react";

export type DateRange = "today" | "7d" | "30d" | "90d";

const rangeDays: Record<DateRange, number> = {
  today: 0,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

interface DateRangeContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
  startDate: Date;
  endDate: Date;
  dateStr: string;
}

export const DateRangeContext = createContext<DateRangeContextValue>({
  range: "30d",
  setRange: () => {},
  startDate: new Date(),
  endDate: new Date(),
  dateStr: new Date().toISOString().split("T")[0],
});

export function useDateRangeState(initialRange: DateRange = "30d"): DateRangeContextValue {
  const [range, setRange] = useState<DateRange>(initialRange);

  const { startDate, endDate, dateStr } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - rangeDays[range]);
    start.setHours(0, 0, 0, 0);

    return { startDate: start, endDate: end, dateStr: start.toISOString().split("T")[0] };
  }, [range]);

  return { range, setRange, startDate, endDate, dateStr };
}

export function useDateRange() {
  return useContext(DateRangeContext);
}
