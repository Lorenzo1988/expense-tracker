import { Expense } from "@/types/expense";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";

export type TemplateId =
  | "monthly-summary"
  | "tax-report"
  | "category-analysis"
  | "weekly-digest"
  | "year-overview"
  | "budget-snapshot";

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  gradient: string;
  tags: string[];
  getExpenses: (expenses: Expense[]) => Expense[];
  getLabel: (expenses: Expense[]) => string;
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: "monthly-summary",
    name: "Monthly Summary",
    icon: "📅",
    description: "All expenses from the current calendar month, sorted by date.",
    gradient: "from-blue-500 to-indigo-600",
    tags: ["Recurring", "Monthly"],
    getExpenses: (expenses) => {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return expenses
        .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    getLabel: (expenses) => `${format(new Date(), "MMMM yyyy")}`,
  },
  {
    id: "tax-report",
    name: "Tax Report",
    icon: "🧾",
    description:
      "Full year transaction log with running totals. Formatted for accounting and filing.",
    gradient: "from-emerald-500 to-teal-600",
    tags: ["Accounting", "Annual", "Filing"],
    getExpenses: (expenses) => {
      const now = new Date();
      const start = startOfYear(now);
      const end = endOfYear(now);
      return expenses
        .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    getLabel: () => `Tax Year ${new Date().getFullYear()}`,
  },
  {
    id: "category-analysis",
    name: "Category Analysis",
    icon: "📊",
    description:
      "Expenses grouped by category with per-category totals, averages, and counts.",
    gradient: "from-purple-500 to-pink-600",
    tags: ["Analytics", "Grouped"],
    getExpenses: (expenses) =>
      [...expenses].sort((a, b) => a.category.localeCompare(b.category)),
    getLabel: (expenses) => `${expenses.length} transactions`,
  },
  {
    id: "weekly-digest",
    name: "Weekly Digest",
    icon: "📬",
    description:
      "Last 7 days of spending. Perfect for weekly reviews and recurring email reports.",
    gradient: "from-orange-500 to-rose-500",
    tags: ["Recurring", "Weekly", "Digest"],
    getExpenses: (expenses) => {
      const cutoff = subDays(new Date(), 7);
      return expenses
        .filter((e) => parseISO(e.date) >= cutoff)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    getLabel: () => `Last 7 days`,
  },
  {
    id: "year-overview",
    name: "Year Overview",
    icon: "🗓️",
    description:
      "All expenses for the current year aggregated by month. Ideal for annual planning.",
    gradient: "from-cyan-500 to-blue-600",
    tags: ["Annual", "Planning"],
    getExpenses: (expenses) => {
      const now = new Date();
      const start = startOfYear(now);
      return expenses
        .filter((e) => parseISO(e.date) >= start)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    getLabel: () => `Year ${new Date().getFullYear()}`,
  },
  {
    id: "budget-snapshot",
    name: "Budget Snapshot",
    icon: "💰",
    description:
      "Current month vs. previous month comparison. Share with your accountant or financial advisor.",
    gradient: "from-amber-500 to-orange-600",
    tags: ["Comparison", "Sharing"],
    getExpenses: (expenses) => {
      const now = new Date();
      const start = startOfMonth(now);
      const prevStart = startOfMonth(
        new Date(now.getFullYear(), now.getMonth() - 1, 1)
      );
      return expenses
        .filter((e) => parseISO(e.date) >= prevStart)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    getLabel: () =>
      `${format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), "MMM")} – ${format(new Date(), "MMM yyyy")}`,
  },
];
