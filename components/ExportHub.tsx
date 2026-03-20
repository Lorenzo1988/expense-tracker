"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, Cloud, Download, Mail, Sheet, HardDrive, Slack,
  Clock, History, CalendarClock, LayoutTemplate,
  CheckCircle2, XCircle, Loader2, Link2, Plus, Trash2,
  ToggleLeft, ToggleRight, ChevronRight, Copy, Check,
  RefreshCw, Zap, ExternalLink,
} from "lucide-react";
import { Expense, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EXPORT_TEMPLATES, ExportTemplate, TemplateId } from "@/lib/exportTemplates";
import {
  useExportHub,
  DestinationId,
  ExportFormat,
  ExportSchedule,
  ScheduleFrequency,
  HistoryEntry,
} from "@/hooks/useExportHub";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// ── Local CSV/JSON download ────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCSV(expenses: Expense[]): string {
  const header = "Date,Category,Amount,Description\n";
  return (
    header +
    expenses
      .map(
        (e) =>
          `${e.date},${e.category},${e.amount.toFixed(2)},"${e.description.replace(/"/g, '""')}"`
      )
      .join("\n")
  );
}

function buildJSON(expenses: Expense[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      totalRecords: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
      expenses: expenses.map(({ date, category, amount, description }) => ({
        date, category, amount, description,
      })),
    },
    null,
    2
  );
}

function openPrintWindow(expenses: Expense[], title: string) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const rows = expenses
    .map(
      (e) =>
        `<tr><td>${formatDate(e.date)}</td><td>${CATEGORY_ICONS[e.category]} ${e.category}</td><td style="font-variant-numeric:tabular-nums">${formatCurrency(e.amount)}</td><td style="color:#6b7280">${e.description}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;font-size:12px;padding:32px;color:#111827}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}.hdr h1{font-size:20px;font-weight:700}.stats{display:flex;gap:20px;margin-bottom:18px}.stat{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px}.stat-l{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}.stat-v{font-size:16px;font-weight:700;margin-top:2px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;background:#f3f4f6}td{padding:8px 10px;border-bottom:1px solid #f3f4f6}footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center}@media print{@page{margin:1cm}}</style>
</head><body>
<div class="hdr"><div><h1>Expense Report</h1><div style="font-size:11px;color:#6b7280;margin-top:3px">${title}</div></div><div style="font-size:11px;color:#6b7280">Generated ${format(new Date(), "PPP")}</div></div>
<div class="stats"><div class="stat"><div class="stat-l">Records</div><div class="stat-v">${expenses.length}</div></div><div class="stat"><div class="stat-l">Total</div><div class="stat-v">${formatCurrency(total)}</div></div></div>
<table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>
<footer>Exported from Expense Tracker &mdash; ${format(new Date(), "PPP")}</footer>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const win = window.open(
    URL.createObjectURL(new Blob([html], { type: "text/html" })),
    "_blank"
  );
  if (!win) alert("Allow pop-ups to open the PDF print view.");
}

// ── Destination metadata ───────────────────────────────────────────────────

interface DestMeta {
  id: DestinationId;
  name: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  authLabel: string; // placeholder account shown after mock-connect
  description: string;
}

const DESTINATIONS: DestMeta[] = [
  { id: "download", name: "Local Download", icon: <Download size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", authLabel: "Local Device", description: "Save directly to your computer" },
  { id: "email", name: "Email", icon: <Mail size={20} />, color: "text-blue-600", bg: "bg-blue-50", authLabel: "you@example.com", description: "Send to any email address" },
  { id: "google-sheets", name: "Google Sheets", icon: <Sheet size={20} />, color: "text-green-600", bg: "bg-green-50", authLabel: "My Expense Sheet", description: "Append rows to a spreadsheet" },
  { id: "dropbox", name: "Dropbox", icon: <Cloud size={20} />, color: "text-sky-600", bg: "bg-sky-50", authLabel: "/Apps/ExpenseTracker", description: "Save to your Dropbox folder" },
  { id: "onedrive", name: "OneDrive", icon: <HardDrive size={20} />, color: "text-blue-700", bg: "bg-blue-100", authLabel: "OneDrive / Expenses", description: "Sync with Microsoft 365" },
  { id: "slack", name: "Slack", icon: <Slack size={20} />, color: "text-purple-600", bg: "bg-purple-50", authLabel: "#finance-reports", description: "Post a summary to a channel" },
];

// ── QR Code visual (decorative) ───────────────────────────────────────────

function QRCode({ value }: { value: string }) {
  const SIZE = 21;
  const cells = useMemo(() => {
    let h = 5381;
    for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;

    const grid: boolean[] = new Array(SIZE * SIZE).fill(false);

    // Finder patterns (top-left, top-right, bottom-left)
    const finder = (sr: number, sc: number) => {
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[(sr + r) * SIZE + (sc + c)] = edge || inner;
        }
    };
    finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);

    // Data modules
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = Math.floor(i / SIZE), c = i % SIZE;
      if ((r < 8 && c < 8) || (r < 8 && c >= SIZE - 8) || (r >= SIZE - 8 && c < 8)) continue;
      grid[i] = (((h * (i * 6364136223 + 1442695041)) >>> 16) & 1) === 1;
    }
    return grid;
  }, [value]);

  return (
    <div className="inline-grid border-4 border-white rounded" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 0 }}>
      {cells.map((on, i) => (
        <div key={i} style={{ width: 6, height: 6, background: on ? "#111827" : "#ffffff" }} />
      ))}
    </div>
  );
}

// ── Copy-to-clipboard button ───────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Share sheet ────────────────────────────────────────────────────────────

function ShareSheet({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const url = entry.shareUrl ?? "https://xptr.app/s/------";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Share Export</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p><span className="font-medium text-gray-700">{entry.templateName}</span></p>
          <p>{entry.recordCount} records · {formatCurrency(entry.totalAmount)}</p>
          <p className="text-gray-400">{formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <code className="flex-1 text-xs text-indigo-600 truncate">{url}</code>
          <CopyButton text={url} />
        </div>
        <div className="flex flex-col items-center gap-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Scan QR Code</p>
          <QRCode value={url} />
          <p className="text-[10px] text-gray-400">Link expires in 7 days</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Email link", icon: <Mail size={13} /> },
            { label: "Copy embed", icon: <Link2 size={13} /> },
            { label: "Open link", icon: <ExternalLink size={13} /> },
          ].map(({ label, icon }) => (
            <button key={label} className="flex flex-col items-center gap-1.5 py-2.5 px-2 text-[11px] font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <span className="text-indigo-500">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Templates ─────────────────────────────────────────────────────────

function TemplatesTab({
  expenses,
  connections,
  onRun,
}: {
  expenses: Expense[];
  connections: ReturnType<typeof useExportHub>["connections"];
  onRun: (template: ExportTemplate, dest: DestinationId, fmt: ExportFormat) => Promise<void>;
}) {
  const [selected, setSelected] = useState<TemplateId | null>(null);
  const [dest, setDest] = useState<DestinationId>("download");
  const [fmt, setFmt] = useState<ExportFormat>("csv");
  const [running, setRunning] = useState<TemplateId | null>(null);

  const template = EXPORT_TEMPLATES.find((t) => t.id === selected);
  const preview = template ? template.getExpenses(expenses) : [];

  async function handleRun() {
    if (!template || running) return;
    setRunning(template.id);
    await onRun(template, dest, fmt);
    setRunning(null);
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Export Templates</h3>
        <p className="text-xs text-gray-500 mt-0.5">Pre-built reports for common use cases. Pick one, choose a destination, and send.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {EXPORT_TEMPLATES.map((t) => {
          const count = t.getExpenses(expenses).length;
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(isSelected ? null : t.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
              }`}
            >
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${t.gradient} text-white text-lg mb-2.5 shadow-sm`}>
                {t.icon}
              </div>
              <div className="text-sm font-semibold text-gray-900">{t.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</div>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                  {count} records
                </span>
                {t.tags.slice(0, 1).map((tag) => (
                  <span key={tag} className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Run panel */}
      {template && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${template.gradient} text-white flex items-center justify-center text-sm`}>
              {template.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{template.name}</div>
              <div className="text-xs text-gray-500">{template.getLabel(expenses)} · {preview.length} records · {formatCurrency(preview.reduce((s, e) => s + e.amount, 0))}</div>
            </div>
          </div>

          {/* Format */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Format</div>
            <div className="flex gap-2">
              {(["csv", "json", "pdf"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFmt(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all uppercase ${
                    fmt === f
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Destination */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Send To</div>
            <div className="grid grid-cols-3 gap-2">
              {DESTINATIONS.map((d) => {
                const conn = connections[d.id];
                const isActive = dest === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDest(d.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className={conn.connected ? d.color : "text-gray-300"}>{d.icon}</span>
                    <span className="truncate w-full text-center">{d.name}</span>
                    {!conn.connected && d.id !== "download" && (
                      <span className="text-[9px] text-amber-500">Not connected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={!!running || preview.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {running === template.id ? (
              <><Loader2 size={15} className="animate-spin" /> Sending…</>
            ) : (
              <><Zap size={15} /> Run Export</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Send To ───────────────────────────────────────────────────────────

function SendToTab({
  connections,
  onConnect,
  onDisconnect,
}: {
  connections: ReturnType<typeof useExportHub>["connections"];
  onConnect: (id: DestinationId, label: string) => void;
  onDisconnect: (id: DestinationId) => void;
}) {
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [inputVal, setInputVal] = useState("");

  async function handleConnect(dest: DestinationId, defaultLabel: string) {
    setConnecting(dest);
    setInputVal(defaultLabel);
  }

  async function confirmConnect(dest: DestinationId) {
    setConnecting(null);
    // Simulate brief OAuth/auth delay
    await new Promise((r) => setTimeout(r, 800));
    onConnect(dest, inputVal || DESTINATIONS.find((d) => d.id === dest)!.authLabel);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Connected Services</h3>
        <p className="text-xs text-gray-500 mt-0.5">Connect your accounts to send exports directly — no manual downloading required.</p>
      </div>

      <div className="space-y-3">
        {DESTINATIONS.map((d) => {
          const conn = connections[d.id];
          const isConnecting = connecting === d.id;

          return (
            <div key={d.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${d.bg} ${d.color} flex items-center justify-center shrink-0`}>
                  {d.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{d.name}</span>
                    {conn.connected ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Not connected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {conn.connected ? conn.accountLabel : d.description}
                  </div>
                </div>
                {d.id !== "download" && (
                  conn.connected ? (
                    <button
                      onClick={() => onDisconnect(d.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(d.id, d.authLabel)}
                      className={`text-xs font-semibold ${d.color} ${d.bg} px-3 py-1.5 rounded-lg transition-colors shrink-0`}
                    >
                      Connect
                    </button>
                  )
                )}
              </div>

              {/* Mock auth flow */}
              {isConnecting && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                  <p className="text-xs text-gray-500 font-medium">
                    {d.id === "email" ? "Enter email address" :
                     d.id === "slack" ? "Enter channel name" :
                     d.id === "google-sheets" ? "Enter spreadsheet name" :
                     "Enter folder path"}
                  </p>
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onKeyDown={(e) => e.key === "Enter" && confirmConnect(d.id)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmConnect(d.id)}
                      className={`flex-1 py-1.5 text-xs font-semibold text-white bg-gradient-to-r ${
                        d.id === "google-sheets" ? "from-green-500 to-emerald-600" :
                        d.id === "dropbox" ? "from-sky-500 to-blue-600" :
                        d.id === "onedrive" ? "from-blue-600 to-blue-700" :
                        d.id === "slack" ? "from-purple-500 to-purple-700" :
                        "from-blue-500 to-blue-600"
                      } rounded-lg`}
                    >
                      Authorize {d.name}
                    </button>
                    <button onClick={() => setConnecting(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Schedule ──────────────────────────────────────────────────────────

function ScheduleTab({
  schedules,
  connections,
  onAdd,
  onToggle,
  onDelete,
}: {
  schedules: ExportSchedule[];
  connections: ReturnType<typeof useExportHub>["connections"];
  onAdd: (s: Omit<ExportSchedule, "id" | "nextRun">) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId>("weekly-digest");
  const [destination, setDestination] = useState<DestinationId>("email");
  const [fmt, setFmt] = useState<ExportFormat>("pdf");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");

  function handleAdd() {
    const tmpl = EXPORT_TEMPLATES.find((t) => t.id === templateId)!;
    onAdd({ templateId, templateName: tmpl.name, destination, format: fmt, frequency, enabled: true });
    setShowForm(false);
  }

  const frequencyLabel: Record<ScheduleFrequency, string> = {
    daily: "Every day",
    weekly: "Every week",
    monthly: "Every month",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Scheduled Exports</h3>
          <p className="text-xs text-gray-500 mt-0.5">Automate your reports. We'll run them in the background and send them on schedule.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shrink-0"
          >
            <Plus size={13} /> New schedule
          </button>
        )}
      </div>

      {/* New schedule form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-4 space-y-4">
          <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">New Schedule</h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Template</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value as TemplateId)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {EXPORT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Format</label>
                <select value={fmt} onChange={(e) => setFmt(e.target.value as ExportFormat)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Destination</label>
              <div className="grid grid-cols-3 gap-1.5">
                {DESTINATIONS.map((d) => (
                  <button key={d.id} onClick={() => setDestination(d.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                      destination === d.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className={destination === d.id ? "text-indigo-500" : "text-gray-400"}>{d.icon}</span>
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
              Create Schedule
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {schedules.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarClock size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">No schedules yet</p>
          <p className="text-xs mt-1">Set one up to automate your reports.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {schedules.map((s) => {
            const tmpl = EXPORT_TEMPLATES.find((t) => t.id === s.templateId);
            const dest = DESTINATIONS.find((d) => d.id === s.destination)!;
            return (
              <div key={s.id} className={`bg-white border rounded-2xl p-4 shadow-sm transition-opacity ${!s.enabled ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-400 to-gray-500"} text-white flex items-center justify-center text-base shrink-0`}>
                    {tmpl?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{s.templateName}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onToggle(s.id)} className="text-gray-400 hover:text-indigo-500 transition-colors">
                          {s.enabled ? <ToggleRight size={20} className="text-indigo-500" /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => onDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <RefreshCw size={11} /> {frequencyLabel[s.frequency]}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={dest.color}>{dest.icon}</span> {dest.name}
                      </span>
                      <span className="uppercase font-medium text-gray-500">{s.format}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-indigo-600">
                      <Clock size={11} />
                      Next: {format(parseISO(s.nextRun), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: History ───────────────────────────────────────────────────────────

function HistoryTab({
  history,
  onClear,
  onRerun,
}: {
  history: HistoryEntry[];
  onClear: () => void;
  onRerun: (entry: HistoryEntry) => void;
}) {
  const [sharing, setSharing] = useState<HistoryEntry | null>(null);

  const destIcon = (id: DestinationId) => {
    const d = DESTINATIONS.find((d) => d.id === id);
    return d ? <span className={d.color}>{d.icon}</span> : null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Export History</h3>
          <p className="text-xs text-gray-500 mt-0.5">{history.length} export{history.length !== 1 ? "s" : ""} recorded</p>
        </div>
        {history.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">No exports yet</p>
          <p className="text-xs mt-1">Run a template to see history here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => {
            const tmpl = EXPORT_TEMPLATES.find((t) => t.id === entry.templateId);
            return (
              <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm group">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-400 to-gray-500"} text-white flex items-center justify-center text-base shrink-0`}>
                    {tmpl?.icon ?? "📁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{entry.templateName}</span>
                      {entry.status === "completed" ? (
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-red-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {destIcon(entry.destination)}
                        {DESTINATIONS.find((d) => d.id === entry.destination)?.name}
                      </span>
                      <span>·</span>
                      <span>{entry.recordCount} records</span>
                      <span>·</span>
                      <span className="font-medium text-gray-600">{formatCurrency(entry.totalAmount)}</span>
                      <span>·</span>
                      <span className="uppercase text-gray-400">{entry.format}</span>
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.shareUrl && (
                      <button
                        onClick={() => setSharing(entry)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Share"
                      >
                        <Link2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onRerun(entry)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Re-run"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sharing && <ShareSheet entry={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

// ── Main: ExportHub drawer ─────────────────────────────────────────────────

type HubTab = "templates" | "send-to" | "schedule" | "history";

const TABS: { id: HubTab; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <LayoutTemplate size={16} /> },
  { id: "send-to", label: "Send To", icon: <Cloud size={16} /> },
  { id: "schedule", label: "Schedule", icon: <CalendarClock size={16} /> },
  { id: "history", label: "History", icon: <History size={16} /> },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

export default function ExportHub({ isOpen, onClose, expenses }: Props) {
  const [activeTab, setActiveTab] = useState<HubTab>("templates");
  const [toast, setToast] = useState<string | null>(null);
  const hub = useExportHub();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const connectedCount = Object.values(hub.connections).filter((c) => c.connected).length;

  async function handleRun(
    template: ExportTemplate,
    dest: DestinationId,
    fmt: ExportFormat
  ) {
    const data = template.getExpenses(expenses);
    await new Promise((r) => setTimeout(r, 700)); // simulate processing

    // Perform actual local download
    if (dest === "download" || !hub.connections[dest].connected) {
      if (fmt === "csv") triggerDownload(buildCSV(data), `${template.id}.csv`, "text/csv");
      else if (fmt === "json") triggerDownload(buildJSON(data), `${template.id}.json`, "application/json");
      else openPrintWindow(data, template.name);
    }

    hub.addHistoryEntry({
      templateId: template.id,
      templateName: template.name,
      destination: dest,
      format: fmt,
      recordCount: data.length,
      totalAmount: data.reduce((s, e) => s + e.amount, 0),
      status: "completed",
    });

    const destName = DESTINATIONS.find((d) => d.id === dest)?.name ?? dest;
    showToast(`✓ ${template.name} sent to ${destName}`);
    setActiveTab("history");
  }

  function handleRerun(entry: HistoryEntry) {
    const template = EXPORT_TEMPLATES.find((t) => t.id === entry.templateId);
    if (!template) return;
    handleRun(template, entry.destination, entry.format);
  }

  // Slide-over drawer — CSS transition
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-gray-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm">
            <Cloud size={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Export Hub</h2>
            <p className="text-xs text-gray-400">
              {connectedCount} service{connectedCount !== 1 ? "s" : ""} connected
              {" · "}
              {hub.schedules.filter((s) => s.enabled).length} active schedule{hub.schedules.filter((s) => s.enabled).length !== 1 ? "s" : ""}
            </p>
          </div>
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-600">Live</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 bg-white px-4 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}{t.label}
              {t.id === "history" && hub.history.length > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-full px-1">
                  {hub.history.length}
                </span>
              )}
              {t.id === "schedule" && hub.schedules.filter((s) => s.enabled).length > 0 && (
                <span className="ml-0.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "templates" && (
            <TemplatesTab
              expenses={expenses}
              connections={hub.connections}
              onRun={handleRun}
            />
          )}
          {activeTab === "send-to" && (
            <SendToTab
              connections={hub.connections}
              onConnect={hub.connect}
              onDisconnect={hub.disconnect}
            />
          )}
          {activeTab === "schedule" && (
            <ScheduleTab
              schedules={hub.schedules}
              connections={hub.connections}
              onAdd={hub.addSchedule}
              onToggle={hub.toggleSchedule}
              onDelete={hub.deleteSchedule}
            />
          )}
          {activeTab === "history" && (
            <HistoryTab
              history={hub.history}
              onClear={hub.clearHistory}
              onRerun={handleRerun}
            />
          )}
        </div>

        {/* Toast */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300"
          style={{ opacity: toast ? 1 : 0, transform: `translateX(-50%) translateY(${toast ? 0 : 8}px)` }}
        >
          <div className="flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
            <CheckCircle2 size={13} className="text-emerald-400" />
            {toast}
          </div>
        </div>
      </div>
    </>
  );
}
