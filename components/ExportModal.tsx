"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Download,
  FileText,
  FileJson,
  FileBadge,
  Calendar,
  Tag,
  FileInput,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Expense, Category, CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ExportFormat,
  filterExportData,
  getExportTotal,
  downloadCSV,
  downloadJSON,
  downloadPDF,
} from "@/lib/exportUtils";
import { format } from "date-fns";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  ext: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "csv",
    label: "CSV",
    ext: ".csv",
    description: "Spreadsheet-compatible",
    icon: <FileText size={18} />,
  },
  {
    id: "json",
    label: "JSON",
    ext: ".json",
    description: "Structured data format",
    icon: <FileJson size={18} />,
  },
  {
    id: "pdf",
    label: "PDF",
    ext: ".pdf",
    description: "Print-ready report",
    icon: <FileBadge size={18} />,
  },
];

type ExportState = "idle" | "exporting" | "done";

const PREVIEW_LIMIT = 8;

export default function ExportModal({ isOpen, onClose, expenses }: Props) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [filename, setFilename] = useState(
    `expenses-${new Date().toISOString().slice(0, 10)}`
  );
  const [exportState, setExportState] = useState<ExportState>("idle");
  const filenameRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormat("csv");
      setDateFrom("");
      setDateTo("");
      setSelectedCategories([]);
      setFilename(`expenses-${new Date().toISOString().slice(0, 10)}`);
      setExportState("idle");
    }
  }, [isOpen]);

  const filtered = useMemo(
    () =>
      filterExportData(expenses, {
        dateFrom,
        dateTo,
        categories: selectedCategories,
      }),
    [expenses, dateFrom, dateTo, selectedCategories]
  );

  const total = useMemo(() => getExportTotal(filtered), [filtered]);
  const preview = filtered.slice(0, PREVIEW_LIMIT);
  const overflow = filtered.length - PREVIEW_LIMIT;

  const ext = FORMAT_OPTIONS.find((f) => f.id === format)!.ext;
  const fullFilename = filename || "expenses";

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function selectAllCategories() {
    setSelectedCategories([]);
  }

  async function handleExport() {
    if (filtered.length === 0 || exportState !== "idle") return;
    setExportState("exporting");

    // Brief artificial delay so the spinner registers visually
    await new Promise((r) => setTimeout(r, 600));

    try {
      if (format === "csv") downloadCSV(filtered, fullFilename);
      else if (format === "json") downloadJSON(filtered, fullFilename);
      else downloadPDF(filtered, fullFilename);
      setExportState("done");
      setTimeout(() => {
        setExportState("idle");
        onClose();
      }, 1200);
    } catch {
      setExportState("idle");
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Download size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Export Expenses</h2>
              <p className="text-xs text-gray-500">Configure and download your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Config Panel ── */}
          <div className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto p-5 space-y-6">
            {/* Format */}
            <section>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <FileText size={12} /> Format
              </label>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      format === opt.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className={format === opt.id ? "text-indigo-600" : "text-gray-400"}>
                      {opt.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium">
                        {opt.label}
                        <span className="ml-1 text-xs font-normal opacity-60">{opt.ext}</span>
                      </div>
                      <div className="text-xs opacity-60">{opt.description}</div>
                    </div>
                    {format === opt.id && (
                      <CheckCircle2 size={16} className="ml-auto text-indigo-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Date Range */}
            <section>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <Calendar size={12} /> Date Range
              </label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={dateTo || undefined}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </section>

            {/* Categories */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <Tag size={12} /> Categories
                </label>
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-indigo-500 hover:underline"
                >
                  {selectedCategories.length === 0 ? "All selected" : "Select all"}
                </button>
              </div>
              <div className="space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected =
                    selectedCategories.length === 0 || selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (selectedCategories.length === 0) {
                            // Deselecting from "all" — select all except this one
                            setSelectedCategories(CATEGORIES.filter((c) => c !== cat));
                          } else {
                            toggleCategory(cat);
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      <span
                        className="text-sm flex items-center gap-1.5"
                        style={{ color: isSelected ? CATEGORY_COLORS[cat] : "#9ca3af" }}
                      >
                        {CATEGORY_ICONS[cat]} {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Filename */}
            <section>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <FileInput size={12} /> Filename
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent">
                <input
                  ref={filenameRef}
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none min-w-0"
                  placeholder="expenses"
                />
                <span className="px-2.5 py-2 text-xs text-gray-400 bg-gray-50 border-l border-gray-200 shrink-0">
                  {ext}
                </span>
              </div>
            </section>
          </div>

          {/* ── Right: Preview Panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Summary Bar */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Records
                  </div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {filtered.length}
                  </div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Total Amount
                  </div>
                  <div className="text-2xl font-bold text-indigo-600 tabular-nums">
                    {formatCurrency(total)}
                  </div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Format
                  </div>
                  <div className="text-2xl font-bold text-gray-900 uppercase">
                    {format}
                  </div>
                </div>
              </div>
              {filtered.length === 0 && (
                <div className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  No records match your filters
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <div className="text-5xl">🔍</div>
                  <p className="text-sm font-medium text-gray-500">No expenses match your filters</p>
                  <p className="text-xs">Adjust the date range or categories</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Date", "Category", "Amount", "Description"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(e.date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: CATEGORY_COLORS[e.category] + "18",
                                color: CATEGORY_COLORS[e.category],
                              }}
                            >
                              {CATEGORY_ICONS[e.category]} {e.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                            {formatCurrency(e.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {e.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {overflow > 0 && (
                    <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 flex items-center gap-1">
                      <ChevronRight size={12} />
                      {overflow} more record{overflow !== 1 ? "s" : ""} not shown in preview
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            {filtered.length === expenses.length
              ? `All ${expenses.length} expenses`
              : `${filtered.length} of ${expenses.length} expenses`}
            {" · "}
            {FORMAT_OPTIONS.find((f) => f.id === format)?.description}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={exportState === "exporting"}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0 || exportState !== "idle"}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {exportState === "exporting" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Exporting…
                </>
              ) : exportState === "done" ? (
                <>
                  <CheckCircle2 size={15} />
                  Done!
                </>
              ) : (
                <>
                  <Download size={15} />
                  Export {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
