"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface ChartDay {
  date: string;
  calories: number;
}

interface WeeklyChartProps {
  days: ChartDay[];
  goal: number;
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyChart({ days, goal }: WeeklyChartProps) {
  const chartData = days.map((d) => {
    const date = new Date(d.date + "T00:00:00");
    return {
      name: SHORT_DAYS[date.getDay()],
      calories: Math.round(d.calories),
    };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              background: "#1a1a1a",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
            formatter={(value) => [`${value} kcal`, "Calories"]}
          />
          <ReferenceLine
            y={goal}
            stroke={COLORS.primary}
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: "Goal",
              position: "insideTopRight",
              fill: COLORS.primary,
              fontSize: 11,
            }}
          />
          <Bar
            dataKey="calories"
            fill={COLORS.calories}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
