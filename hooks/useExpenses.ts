"use client";

import { useState, useEffect, useCallback } from "react";
import { Expense, ExpenseFormData, Category } from "@/types/expense";

const STORAGE_KEY = "expense-tracker-data";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Expense[];
  } catch {
    return [];
  }
}

function saveToStorage(expenses: Expense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // Storage might be full; silently ignore
  }
}

export interface FilterState {
  search: string;
  category: Category | "All";
  dateFrom: string;
  dateTo: string;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setExpenses(loadFromStorage());
    setIsLoaded(true);
  }, []);

  const addExpense = useCallback((data: ExpenseFormData): Expense => {
    const expense: Expense = {
      id: generateId(),
      date: data.date,
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description.trim(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => {
      const next = [expense, ...prev];
      saveToStorage(next);
      return next;
    });
    return expense;
  }, []);

  const updateExpense = useCallback(
    (id: string, data: ExpenseFormData): void => {
      setExpenses((prev) => {
        const next = prev.map((e) =>
          e.id === id
            ? {
                ...e,
                date: data.date,
                amount: parseFloat(data.amount),
                category: data.category,
                description: data.description.trim(),
              }
            : e
        );
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const deleteExpense = useCallback((id: string): void => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const exportCSV = useCallback((filtered: Expense[]): void => {
    const header = "Date,Amount,Category,Description\n";
    const rows = filtered
      .map(
        (e) =>
          `${e.date},${e.amount.toFixed(2)},${e.category},"${e.description.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const seedExpenses = useCallback((seed: Expense[]): void => {
    setExpenses((prev) => {
      const next = [...seed, ...prev];
      saveToStorage(next);
      return next;
    });
  }, []);

  return {
    expenses,
    isLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    exportCSV,
    seedExpenses,
  };
}
