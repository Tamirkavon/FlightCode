"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TierEditor } from "./TierEditor";

interface Tier {
  fromPct: number;
  toPct: number | null;
  rate: number;
}

interface PlanFormData {
  name: string;
  description: string;
  type: "INDIVIDUAL" | "TEAM";
  currency: string;
  periodType: "MONTHLY" | "QUARTERLY";
  effectiveFrom: string;
  effectiveTo: string;
  quotaTarget: number;
  baseRate: number;
  rampMonths: number;
  tiers: Tier[];
}

export function PlanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<PlanFormData>({
    name: "",
    description: "",
    type: "INDIVIDUAL",
    currency: "USD",
    periodType: "MONTHLY",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    quotaTarget: 100000,
    baseRate: 0.05,
    rampMonths: 0,
    tiers: [
      { fromPct: 0, toPct: 100, rate: 0.05 },
      { fromPct: 100, toPct: null, rate: 0.08 },
    ],
  });

  function set<K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        currency: form.currency,
        periodType: form.periodType,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || undefined,
        rules: [
          {
            metric: "REVENUE",
            quotaTarget: form.quotaTarget,
            baseRate: form.baseRate,
            rampMonths: form.rampMonths,
            tiers: form.tiers,
          },
        ],
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(JSON.stringify(data.error));
      return;
    }

    const plan = await res.json();
    router.push(`/plans/${plan.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Basic Info */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Plan Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. AE Q2 2026 Plan"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as "INDIVIDUAL" | "TEAM")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="TEAM">Team</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={form.periodType}
              onChange={(e) => set("periodType", e.target.value as "MONTHLY" | "QUARTERLY")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
            <input
              type="date"
              required
              value={form.effectiveFrom}
              onChange={(e) => set("effectiveFrom", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective To (optional)</label>
            <input
              type="date"
              value={form.effectiveTo}
              onChange={(e) => set("effectiveTo", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Quota & Rates */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Quota & Commission Rates</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quota Target</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">{form.currency}</span>
              <input
                type="number"
                required
                value={form.quotaTarget}
                onChange={(e) => set("quotaTarget", parseFloat(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate (%)</label>
            <input
              type="number"
              required
              value={(form.baseRate * 100).toFixed(1)}
              onChange={(e) => set("baseRate", parseFloat(e.target.value) / 100)}
              step="0.1"
              min={0}
              max={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ramp Months</label>
            <input
              type="number"
              value={form.rampMonths}
              onChange={(e) => set("rampMonths", parseInt(e.target.value))}
              min={0}
              max={24}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accelerator Tiers
          </label>
          <TierEditor tiers={form.tiers} onChange={(tiers) => set("tiers", tiers)} />
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Plan"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-600 px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
