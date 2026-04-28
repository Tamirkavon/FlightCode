"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface AttainmentGaugeProps {
  attainmentPct: number;
  quota: number;
  currency?: string;
}

export function AttainmentGauge({ attainmentPct, quota, currency = "USD" }: AttainmentGaugeProps) {
  const pct = Math.min(attainmentPct, 150);
  const color = pct >= 100 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <RadialBarChart
        width={200}
        height={120}
        cx="50%"
        cy="100%"
        innerRadius={80}
        outerRadius={110}
        startAngle={180}
        endAngle={0}
        data={[{ value: pct, fill: color }]}
      >
        <PolarAngleAxis type="number" domain={[0, 150]} angleAxisId={0} tick={false} />
        <RadialBar
          background={{ fill: "#f3f4f6" }}
          dataKey="value"
          angleAxisId={0}
          cornerRadius={6}
        />
      </RadialBarChart>

      <div className="-mt-8 text-center">
        <p className="text-3xl font-bold" style={{ color }}>
          {attainmentPct.toFixed(0)}%
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          of {currency} {quota.toLocaleString()} quota
        </p>
      </div>
    </div>
  );
}
