"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "@/lib/types";

interface TrendsChartProps {
  data: TrendPoint[];
  metric: string;
  period: string;
  color: string;
}

export default function TrendsChart({ data, metric, period, color }: TrendsChartProps) {
  // Thin out labels
  const interval = period === "year" ? 3 : period === "month" ? 4 : 0;

  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value ?? 0,
  }));

  if (metric === "weight") {
    const filtered = chartData.filter((d) => d.value > 0);
    if (filtered.length === 0) {
      return (
        <div className="flex h-[200px] items-center justify-center text-sm text-text-secondary">
          No data for this period
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} interval={interval} />
          <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5" }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={filtered.length <= 30}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} interval={interval} />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} />
        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #27272a", borderRadius: 8, color: "#f4f4f5" }} />
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
