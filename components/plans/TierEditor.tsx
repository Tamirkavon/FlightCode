"use client";

interface Tier {
  fromPct: number;
  toPct: number | null;
  rate: number;
}

interface TierEditorProps {
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
}

export function TierEditor({ tiers, onChange }: TierEditorProps) {
  function addTier() {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier ? (lastTier.toPct ?? lastTier.fromPct + 20) : 0;
    onChange([
      ...tiers.map((t, i) =>
        i === tiers.length - 1 ? { ...t, toPct: newFrom } : t
      ),
      { fromPct: newFrom, toPct: null, rate: 0.06 },
    ]);
  }

  function removeTier(index: number) {
    const updated = tiers.filter((_, i) => i !== index);
    // Open up the last tier's upper bound
    if (updated.length > 0) {
      updated[updated.length - 1] = { ...updated[updated.length - 1], toPct: null };
    }
    onChange(updated);
  }

  function updateTier(index: number, field: keyof Tier, value: number | null) {
    onChange(tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 px-1">
        <span>From (%)</span>
        <span>To (%)</span>
        <span>Commission Rate</span>
        <span></span>
      </div>

      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center">
          <input
            type="number"
            value={tier.fromPct}
            onChange={(e) => updateTier(i, "fromPct", parseFloat(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            min={0}
          />
          <input
            type="number"
            value={tier.toPct ?? ""}
            placeholder="∞"
            onChange={(e) =>
              updateTier(i, "toPct", e.target.value ? parseFloat(e.target.value) : null)
            }
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={(tier.rate * 100).toFixed(1)}
              onChange={(e) => updateTier(i, "rate", parseFloat(e.target.value) / 100)}
              step="0.1"
              min={0}
              max={100}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          <button
            type="button"
            onClick={() => removeTier(i)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addTier}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-1"
      >
        + Add tier
      </button>

      {tiers.length === 0 && (
        <p className="text-xs text-gray-400">
          No tiers — base rate applies for all attainment levels.
        </p>
      )}
    </div>
  );
}
