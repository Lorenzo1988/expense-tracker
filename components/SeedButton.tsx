"use client";

import { Sparkles } from "lucide-react";
import { Expense, CATEGORIES } from "@/types/expense";
import { format, subDays } from "date-fns";

const SAMPLE_DESCRIPTIONS: Record<string, string[]> = {
  Food: ["Grocery run", "Lunch with team", "Coffee shop", "Pizza night", "Farmers market"],
  Transportation: ["Gas fill-up", "Uber ride", "Monthly transit pass", "Parking fee", "Car wash"],
  Entertainment: ["Netflix subscription", "Movie tickets", "Concert tickets", "Video game", "Bowling night"],
  Shopping: ["New sneakers", "Amazon order", "Clothing haul", "Home decor", "Book purchase"],
  Bills: ["Electric bill", "Internet service", "Phone plan", "Rent payment", "Water bill"],
  Other: ["Gym membership", "Haircut", "Doctor copay", "Pet supplies", "Donation"],
};

function generateSeedExpenses(): Expense[] {
  const expenses: Expense[] = [];
  for (let i = 0; i < 20; i++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const descriptions = SAMPLE_DESCRIPTIONS[category];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    const amount = parseFloat((Math.random() * 150 + 5).toFixed(2));
    expenses.push({
      id: `seed-${i}-${Date.now()}`,
      date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
      amount,
      category,
      description,
      createdAt: new Date().toISOString(),
    });
  }
  return expenses.sort((a, b) => b.date.localeCompare(a.date));
}

interface Props {
  onSeed: (expenses: Expense[]) => void;
  hasData: boolean;
}

export default function SeedButton({ onSeed, hasData }: Props) {
  if (hasData) return null;
  return (
    <button
      onClick={() => onSeed(generateSeedExpenses())}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
    >
      <Sparkles size={15} />
      Load sample data
    </button>
  );
}
