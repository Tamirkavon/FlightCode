"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/integrations/salesforce/sync", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setResult(`Synced ${data.synced} deals successfully.`);
      router.refresh();
    } else {
      setResult(`Error: ${data.error ?? "sync failed"}`);
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Syncing..." : "Sync Now"}
      </button>
      {result && (
        <p className="text-sm mt-2 text-gray-600">{result}</p>
      )}
    </div>
  );
}
