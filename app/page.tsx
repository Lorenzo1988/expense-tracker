"use client";

import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { useExpenses, FilterState } from "@/hooks/useExpenses";
import { applyFilters } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import SummaryCards from "@/components/SummaryCards";
import Charts from "@/components/Charts";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import FilterBar from "@/components/FilterBar";
import SeedButton from "@/components/SeedButton";

type Tab = "dashboard" | "expenses" | "add";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "All",
  dateFrom: "",
  dateTo: "",
};

export default function Home() {
  const { expenses, isLoaded, addExpense, updateExpense, deleteExpense, exportCSV, seedExpenses } =
    useExpenses();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredExpenses = useMemo(
    () => applyFilters(expenses, filters),
    [expenses, filters]
  );

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab !== "expenses") setFilters(DEFAULT_FILTERS);
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Overview of your spending
                </p>
              </div>
              <SeedButton onSeed={seedExpenses} hasData={expenses.length > 0} />
            </div>

            <SummaryCards expenses={expenses} />

            <Charts expenses={expenses} />

            {/* Recent Expenses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">
                  Recent Expenses
                </h2>
                <button
                  onClick={() => handleTabChange("expenses")}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  View all →
                </button>
              </div>
              <div className="px-5 py-2">
                <ExpenseList
                  expenses={expenses.slice(0, 5)}
                  onDelete={deleteExpense}
                  onUpdate={updateExpense}
                />
              </div>
            </div>
          </>
        )}

        {/* ── EXPENSES ── */}
        {activeTab === "expenses" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  All Expenses
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {expenses.length} total transaction
                  {expenses.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => exportCSV(filteredExpenses)}
                disabled={filteredExpenses.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={15} />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <FilterBar
                filters={filters}
                onChange={setFilters}
                totalCount={expenses.length}
                filteredCount={filteredExpenses.length}
              />
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-2">
                <ExpenseList
                  expenses={filteredExpenses}
                  onDelete={deleteExpense}
                  onUpdate={updateExpense}
                />
              </div>
            </div>
          </>
        )}

        {/* ── ADD EXPENSE ── */}
        {activeTab === "add" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Expense</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Record a new transaction
              </p>
            </div>

            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <ExpenseForm
                  onSubmit={(data) => {
                    addExpense(data);
                  }}
                />
              </div>

              {/* Quick tip */}
              <p className="text-xs text-gray-400 mt-3 text-center">
                All expenses are saved automatically to your browser&apos;s local storage.
              </p>
            </div>
          </>
        )}
      </main>
    </>
  );
}
