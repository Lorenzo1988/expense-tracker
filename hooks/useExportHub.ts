"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { TemplateId } from "@/lib/exportTemplates";

// ── Types ──────────────────────────────────────────────────────────────────

export type DestinationId =
  | "download"
  | "email"
  | "google-sheets"
  | "dropbox"
  | "onedrive"
  | "slack";

export type ExportFormat = "csv" | "json" | "pdf";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  templateId: TemplateId;
  templateName: string;
  destination: DestinationId;
  format: ExportFormat;
  recordCount: number;
  totalAmount: number;
  status: "completed" | "failed";
  shareUrl?: string;
}

export interface ExportSchedule {
  id: string;
  templateId: TemplateId;
  templateName: string;
  destination: DestinationId;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  enabled: boolean;
  nextRun: string; // ISO date
  lastRun?: string;
}

export interface ConnectionState {
  connected: boolean;
  accountLabel?: string;
  connectedAt?: string;
}

export type Connections = Record<DestinationId, ConnectionState>;

// ── Storage keys ───────────────────────────────────────────────────────────

const HISTORY_KEY = "export-hub-history";
const SCHEDULES_KEY = "export-hub-schedules";
const CONNECTIONS_KEY = "export-hub-connections";

function nextRunDate(frequency: ScheduleFrequency): string {
  const now = new Date();
  if (frequency === "daily") return addDays(now, 1).toISOString();
  if (frequency === "weekly") return addWeeks(now, 1).toISOString();
  return addMonths(now, 1).toISOString();
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const DEFAULT_CONNECTIONS: Connections = {
  download: { connected: true, accountLabel: "Local Download" },
  email: { connected: false },
  "google-sheets": { connected: false },
  dropbox: { connected: false },
  onedrive: { connected: false },
  slack: { connected: false },
};

const SEED_HISTORY: HistoryEntry[] = [
  {
    id: "seed-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    templateId: "monthly-summary",
    templateName: "Monthly Summary",
    destination: "download",
    format: "csv",
    recordCount: 18,
    totalAmount: 1243.5,
    status: "completed",
    shareUrl: "https://xptr.app/s/a8f3k2",
  },
  {
    id: "seed-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    templateId: "tax-report",
    templateName: "Tax Report",
    destination: "email",
    format: "pdf",
    recordCount: 64,
    totalAmount: 5892.0,
    status: "completed",
    shareUrl: "https://xptr.app/s/t9c1m5",
  },
  {
    id: "seed-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    templateId: "weekly-digest",
    templateName: "Weekly Digest",
    destination: "slack",
    format: "json",
    recordCount: 7,
    totalAmount: 214.8,
    status: "completed",
  },
];

const SEED_SCHEDULES: ExportSchedule[] = [
  {
    id: "sched-seed-1",
    templateId: "weekly-digest",
    templateName: "Weekly Digest",
    destination: "email",
    format: "pdf",
    frequency: "weekly",
    enabled: true,
    nextRun: addDays(new Date(), 4).toISOString(),
  },
];

// ── Hook ───────────────────────────────────────────────────────────────────

export function useExportHub() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [connections, setConnections] = useState<Connections>(DEFAULT_CONNECTIONS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedHistory = loadJSON<HistoryEntry[]>(HISTORY_KEY, null as unknown as HistoryEntry[]);
    const storedSchedules = loadJSON<ExportSchedule[]>(SCHEDULES_KEY, null as unknown as ExportSchedule[]);
    const storedConnections = loadJSON<Connections>(CONNECTIONS_KEY, null as unknown as Connections);

    setHistory(storedHistory ?? SEED_HISTORY);
    setSchedules(storedSchedules ?? SEED_SCHEDULES);
    setConnections(storedConnections ?? DEFAULT_CONNECTIONS);
    setIsLoaded(true);
  }, []);

  const addHistoryEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const full: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      shareUrl: `https://xptr.app/s/${Math.random().toString(36).slice(2, 8)}`,
    };
    setHistory((prev) => {
      const next = [full, ...prev].slice(0, 30);
      saveJSON(HISTORY_KEY, next);
      return next;
    });
    return full;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveJSON(HISTORY_KEY, []);
  }, []);

  const addSchedule = useCallback(
    (s: Omit<ExportSchedule, "id" | "nextRun">) => {
      const full: ExportSchedule = {
        ...s,
        id: `sched-${Date.now()}`,
        nextRun: nextRunDate(s.frequency),
      };
      setSchedules((prev) => {
        const next = [...prev, full];
        saveJSON(SCHEDULES_KEY, next);
        return next;
      });
    },
    []
  );

  const toggleSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      saveJSON(SCHEDULES_KEY, next);
      return next;
    });
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveJSON(SCHEDULES_KEY, next);
      return next;
    });
  }, []);

  const connect = useCallback((dest: DestinationId, accountLabel: string) => {
    setConnections((prev) => {
      const next = {
        ...prev,
        [dest]: { connected: true, accountLabel, connectedAt: new Date().toISOString() },
      };
      saveJSON(CONNECTIONS_KEY, next);
      return next;
    });
  }, []);

  const disconnect = useCallback((dest: DestinationId) => {
    setConnections((prev) => {
      const next = { ...prev, [dest]: { connected: false } };
      saveJSON(CONNECTIONS_KEY, next);
      return next;
    });
  }, []);

  return {
    isLoaded,
    history,
    schedules,
    connections,
    addHistoryEntry,
    clearHistory,
    addSchedule,
    toggleSchedule,
    deleteSchedule,
    connect,
    disconnect,
  };
}
