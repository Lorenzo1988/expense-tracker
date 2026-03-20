import { Expense, Category, CATEGORY_ICONS } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";
import { parseISO } from "date-fns";

export type ExportFormat = "csv" | "json" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  categories: Category[];
  filename: string;
}

export function filterExportData(
  expenses: Expense[],
  options: Pick<ExportOptions, "dateFrom" | "dateTo" | "categories">
): Expense[] {
  return expenses.filter((e) => {
    if (options.categories.length > 0 && !options.categories.includes(e.category))
      return false;
    if (options.dateFrom && parseISO(e.date) < parseISO(options.dateFrom))
      return false;
    if (options.dateTo && parseISO(e.date) > parseISO(options.dateTo))
      return false;
    return true;
  });
}

export function getExportTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(expenses: Expense[], filename: string): void {
  const header = "Date,Category,Amount,Description\n";
  const rows = expenses
    .map(
      (e) =>
        `${e.date},${e.category},${e.amount.toFixed(2)},"${e.description.replace(/"/g, '""')}"`
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadJSON(expenses: Expense[], filename: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: getExportTotal(expenses),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  triggerDownload(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

export function downloadPDF(expenses: Expense[], filename: string): void {
  const total = getExportTotal(expenses);
  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = expenses
    .map(
      (e) => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td><span class="badge">${CATEGORY_ICONS[e.category]} ${e.category}</span></td>
        <td class="amount">${formatCurrency(e.amount)}</td>
        <td class="desc">${e.description}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1f2937; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
    .title { font-size: 22px; font-weight: 700; color: #111827; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 11px; color: #6b7280; }
    .summary { display: flex; gap: 24px; margin-bottom: 20px; }
    .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; }
    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f3f4f6; }
    th { text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .amount { font-weight: 600; font-variant-numeric: tabular-nums; }
    .desc { color: #4b5563; max-width: 220px; }
    .badge { font-size: 11px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Expense Report</div>
      <div class="subtitle">${filename}</div>
    </div>
    <div class="meta">
      <div>Generated ${exportDate}</div>
    </div>
  </div>
  <div class="summary">
    <div class="stat">
      <div class="stat-label">Total Records</div>
      <div class="stat-value">${expenses.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Amount</div>
      <div class="stat-value">${formatCurrency(total)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Amount</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Exported from Expense Tracker &mdash; ${exportDate}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Fallback if popup blocked: download as HTML
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename.replace(".pdf", ".html") : `${filename}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
