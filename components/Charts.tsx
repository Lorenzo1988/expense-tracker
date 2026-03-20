"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Expense, CATEGORY_COLORS, Category } from "@/types/expense";
import { getCategoryTotals, getMonthlyTrend, formatCurrency } from "@/lib/utils";

interface Props {
  expenses: Expense[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; name: string }[] }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-800">{payload[0].name}</p>
        <p className="text-gray-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-indigo-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function Charts({ expenses }: Props) {
  const categoryTotals = getCategoryTotals(expenses);
  const monthlyTrend = getMonthlyTrend(expenses);

  const pieData = categoryTotals.map(({ category, total }) => ({
    name: category,
    value: total,
    color: CATEGORY_COLORS[category as Category],
  }));

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Add expenses to see charts
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie / Donut Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Spending by Category
        </h3>
        {pieData.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {pieData.map(({ name, value, color }) => {
                const total = pieData.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-600 flex-1">{name}</span>
                    <span className="text-xs font-semibold text-gray-800">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No data</p>
        )}
      </div>

      {/* Bar Chart - Monthly Trend */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Monthly Trend (Last 6 Months)
        </h3>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrend} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            Not enough data for trend
          </p>
        )}
      </div>
    </div>
  );
}
