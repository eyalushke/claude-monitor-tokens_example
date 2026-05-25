"use client";

import { useState, useMemo } from "react";

export type DateRange = "today" | "7d" | "30d" | "90d";

const rangeDays: Record<DateRange, number> = {
  today: 0,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function useDateRange(initialRange: DateRange = "30d") {
  const [range, setRange] = useState<DateRange>(initialRange);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - rangeDays[range]);
    start.setHours(0, 0, 0, 0);

    return { startDate: start, endDate: end };
  }, [range]);

  return { range, setRange, startDate, endDate };
}
