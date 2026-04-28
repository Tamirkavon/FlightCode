"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MockDataGenerator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [months, setMonths] = useState(3);

  async function generate() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/mock/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(res.ok ? `Generated ${data.deals} deals across ${data.periods} periods.` : `Error: ${data.error}`);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--bob-gray)" }}>
            Months of history
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: "1.5px solid var(--bob-border)", background: "var(--bob-cream)" }}
          >
            {[1, 2, 3, 6, 12].map((m) => (
              <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
        style={{ background: "var(--bob-pink)" }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "var(--bob-pink-hover)")}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "var(--bob-pink)")}
      >
        {loading ? "Generating…" : "Generate mock data"}
      </button>

      {result && (
        <p className="text-sm" style={{ color: result.startsWith("Error") ? "var(--bob-burgundy)" : "var(--bob-gray)" }}>
          {result}
        </p>
      )}
    </div>
  );
}
