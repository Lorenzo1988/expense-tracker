"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Expense, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";
import ExpenseForm from "./ExpenseForm";
import { ExpenseFormData } from "@/types/expense";

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: ExpenseFormData) => void;
}

type SortField = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

export default function ExpenseList({ expenses, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...expenses].sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") cmp = a.date.localeCompare(b.date);
    else if (sortField === "amount") cmp = a.amount - b.amount;
    else if (sortField === "category") cmp = a.category.localeCompare(b.category);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronDown size={14} className="text-gray-300 ml-1" />;
    return sortDir === "asc" ? (
      <ChevronUp size={14} className="text-indigo-500 ml-1" />
    ) : (
      <ChevronDown size={14} className="text-indigo-500 ml-1" />
    );
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 300);
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">💸</div>
        <p className="text-lg font-medium text-gray-500">No expenses found</p>
        <p className="text-sm mt-1">Add your first expense or adjust filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {(
              [
                { label: "Date", field: "date" },
                { label: "Category", field: "category" },
                { label: "Description", field: null },
                { label: "Amount", field: "amount" },
                { label: "", field: null },
              ] as { label: string; field: SortField | null }[]
            ).map(({ label, field }) => (
              <th
                key={label}
                onClick={() => field && handleSort(field)}
                className={`text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                  field ? "cursor-pointer hover:text-gray-700 select-none" : ""
                }`}
              >
                <span className="inline-flex items-center">
                  {label}
                  {field && <SortIcon field={field} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((expense) => (
            <>
              <tr
                key={expense.id}
                className={`group hover:bg-gray-50 transition-all ${
                  deletingId === expense.id
                    ? "opacity-0 scale-95 duration-300"
                    : "opacity-100 duration-100"
                }`}
              >
                <td className="py-3.5 px-3 text-gray-600 whitespace-nowrap">
                  {formatDate(expense.date)}
                </td>
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[expense.category] + "20",
                      color: CATEGORY_COLORS[expense.category],
                    }}
                  >
                    {CATEGORY_ICONS[expense.category]} {expense.category}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-gray-800 max-w-xs truncate">
                  {expense.description}
                </td>
                <td className="py-3.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setEditingId(
                          editingId === expense.id ? null : expense.id
                        )
                      }
                      className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
              {editingId === expense.id && (
                <tr key={`edit-${expense.id}`}>
                  <td colSpan={5} className="px-3 py-4 bg-indigo-50/50">
                    <div className="border border-indigo-200 rounded-xl p-4 bg-white shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Edit Expense
                      </h3>
                      <ExpenseForm
                        initialData={expense}
                        isEditing
                        onSubmit={(data) => {
                          onUpdate(expense.id, data);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
