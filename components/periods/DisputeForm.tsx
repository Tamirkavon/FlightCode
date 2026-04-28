"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DisputeFormProps {
  commissionRecordId: string;
  dealTitle: string;
  amount: number;
  onClose: () => void;
}

export function DisputeForm({ commissionRecordId, dealTitle, amount, onClose }: DisputeFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRecordId, reason, evidence: evidence || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? "Failed to submit dispute.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="font-bold text-gray-900 mb-1">Dispute Commission</h2>
        <p className="text-sm text-gray-500 mb-4">
          {dealTitle} — ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason *
            </label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this commission amount is incorrect..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evidence (optional)
            </label>
            <textarea
              rows={2}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Links, notes, or additional context..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit Dispute"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-600 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
