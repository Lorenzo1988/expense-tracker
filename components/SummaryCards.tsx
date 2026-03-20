"use client";

import { TrendingUp, Calendar, Tag, Receipt } from "lucide-react";
import { Expense, CATEGORY_ICONS } from "@/types/expense";
import { formatCurrency, getMonthlyTotal, getCategoryTotals } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  expenses: Expense[];
}

export default function SummaryCards({ expenses }: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyTotal = getMonthlyTotal(expenses);
  const categoryTotals = getCategoryTotals(expenses);
  const topCategory = categoryTotals[0];
  const currentMonth = format(new Date(), "MMMM yyyy");

  const cards = [
    {
      label: "Total Expenses",
      value: formatCurrency(total),
      sub: `${expenses.length} transaction${expenses.length !== 1 ? "s" : ""}`,
      icon: <Receipt size={20} />,
      color: "indigo",
    },
    {
      label: `${currentMonth}`,
      value: formatCurrency(monthlyTotal),
      sub: "This month",
      icon: <Calendar size={20} />,
      color: "blue",
    },
    {
      label: "Top Category",
      value: topCategory
        ? `${CATEGORY_ICONS[topCategory.category]} ${topCategory.category}`
        : "—",
      sub: topCategory
        ? `${formatCurrency(topCategory.total)} · ${topCategory.count} items`
        : "No data yet",
      icon: <Tag size={20} />,
      color: "purple",
    },
    {
      label: "Avg. Transaction",
      value: expenses.length > 0 ? formatCurrency(total / expenses.length) : "—",
      sub: "Per expense",
      icon: <TrendingUp size={20} />,
      color: "emerald",
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                colorMap[card.color]
              }`}
            >
              {card.icon}
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 truncate">
            {card.value}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 font-medium uppercase tracking-wide">
            {card.label}
          </div>
          <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
