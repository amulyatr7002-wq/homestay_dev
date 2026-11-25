"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function EarningsChart({ data }: { data: Array<{ month: string; total: number }> }) {
  return (
    <div className="chart-card">
      <div className="chart-heading"><div><p className="workspace-eyebrow">MONEY IN MOTION</p><h2>Earnings over time</h2></div><span>Last 6 months</span></div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#e8e4da" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#77776f", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#77776f", fontSize: 11 }} tickFormatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} width={72} />
            <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Earnings"]} />
            <Line type="monotone" dataKey="total" stroke="#b9684e" strokeWidth={3} dot={{ fill: "#b9684e", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
