import { Expense, Category } from "@/types/expense";
import { FilterState } from "@/hooks/useExpenses";
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function applyFilters(
  expenses: Expense[],
  filters: FilterState
): Expense[] {
  return expenses.filter((e) => {
    if (filters.category !== "All" && e.category !== filters.category)
      return false;
    if (
      filters.search &&
      !e.description.toLowerCase().includes(filters.search.toLowerCase()) &&
      !e.category.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (filters.dateFrom) {
      const from = parseISO(filters.dateFrom);
      const expDate = parseISO(e.date);
      if (expDate < from) return false;
    }
    if (filters.dateTo) {
      const to = parseISO(filters.dateTo);
      const expDate = parseISO(e.date);
      if (expDate > to) return false;
    }
    return true;
  });
}

export function getMonthlyTotal(expenses: Expense[]): number {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return expenses
    .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getCategoryTotals(
  expenses: Expense[]
): { category: Category; total: number; count: number }[] {
  const map: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
    map[e.category].total += e.amount;
    map[e.category].count += 1;
  }
  return Object.entries(map)
    .map(([category, { total, count }]) => ({
      category: category as Category,
      total,
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getMonthlyTrend(
  expenses: Expense[]
): { month: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.date.slice(0, 7); // YYYY-MM
    map[key] = (map[key] || 0) + e.amount;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, total]) => ({
      month: format(parseISO(`${month}-01`), "MMM yy"),
      total,
    }));
}
