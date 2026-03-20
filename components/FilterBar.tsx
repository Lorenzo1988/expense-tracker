"use client";

import { Search, X } from "lucide-react";
import { CATEGORIES, Category } from "@/types/expense";
import { FilterState } from "@/hooks/useExpenses";

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: Props) {
  function update(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function reset() {
    onChange({ search: "", category: "All", dateFrom: "", dateTo: "" });
  }

  const isFiltered =
    filters.search || filters.category !== "All" || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search expenses..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors bg-white"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) =>
            update({ category: e.target.value as Category | "All" })
          }
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors bg-white"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Date From */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors bg-white"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors bg-white"
          />
        </div>

        {isFiltered && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {isFiltered && (
        <p className="text-xs text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-700">{filteredCount}</span>{" "}
          of <span className="font-semibold text-gray-700">{totalCount}</span>{" "}
          expenses
        </p>
      )}
    </div>
  );
}
