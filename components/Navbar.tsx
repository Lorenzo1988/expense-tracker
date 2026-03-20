"use client";

import { LayoutDashboard, List, PlusCircle } from "lucide-react";

interface Props {
  activeTab: "dashboard" | "expenses" | "add";
  onTabChange: (tab: "dashboard" | "expenses" | "add") => void;
}

export default function Navbar({ activeTab, onTabChange }: Props) {
  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "expenses" as const, label: "Expenses", icon: <List size={18} /> },
    { id: "add" as const, label: "Add Expense", icon: <PlusCircle size={18} /> },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              $
            </div>
            <span className="font-bold text-gray-900 text-base">
              Expense<span className="text-indigo-600">Tracker</span>
            </span>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
