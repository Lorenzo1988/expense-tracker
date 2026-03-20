"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus } from "lucide-react";
import { Expense, ExpenseFormData, CATEGORIES, Category } from "@/types/expense";
import { format } from "date-fns";

interface Props {
  onSubmit: (data: ExpenseFormData) => void;
  onCancel?: () => void;
  initialData?: Expense;
  isEditing?: boolean;
}

const EMPTY_FORM: ExpenseFormData = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  category: "Food",
  description: "",
};

interface ValidationErrors {
  date?: string;
  amount?: string;
  description?: string;
}

export default function ExpenseForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: Props) {
  const [form, setForm] = useState<ExpenseFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        date: initialData.date,
        amount: initialData.amount.toString(),
        category: initialData.category,
        description: initialData.description,
      });
    }
  }, [initialData]);

  function validate(data: ExpenseFormData): ValidationErrors {
    const errs: ValidationErrors = {};
    if (!data.date) errs.date = "Date is required.";
    const amt = parseFloat(data.amount);
    if (!data.amount) errs.amount = "Amount is required.";
    else if (isNaN(amt) || amt <= 0) errs.amount = "Enter a valid positive amount.";
    else if (amt > 1_000_000) errs.amount = "Amount seems too large.";
    if (!data.description.trim()) errs.description = "Description is required.";
    else if (data.description.trim().length > 200)
      errs.description = "Max 200 characters.";
    return errs;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const errs = validate({ ...form, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: errs[name as keyof ValidationErrors] }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errs = validate(form);
    setErrors((prev) => ({ ...prev, [name]: errs[name as keyof ValidationErrors] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = { date: true, amount: true, description: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      onSubmit(form);
      if (!isEditing) {
        setForm(EMPTY_FORM);
        setTouched({});
        setErrors({});
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            onBlur={handleBlur}
            max={format(new Date(), "yyyy-MM-dd")}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              errors.date
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          />
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ($) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              $
            </span>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                errors.amount
                  ? "border-red-400 bg-red-50"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors bg-white"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="What did you spend on?"
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              errors.description
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-500">{errors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">
              {form.description.length}/200
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isEditing ? (
            <>
              <Save size={16} />
              Save Changes
            </>
          ) : (
            <>
              <Plus size={16} />
              Add Expense
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <X size={16} />
            Cancel
          </button>
        )}
        {success && (
          <span className="text-sm text-green-600 font-medium animate-pulse">
            ✓ Expense added!
          </span>
        )}
      </div>
    </form>
  );
}
