"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function MockDataUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setResult(null);

    const text = await file.text();
    const res = await fetch("/api/mock/upload-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(
      res.ok
        ? `Imported ${data.imported} deals (${data.skipped} skipped).`
        : `Error: ${data.error}`
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
        style={{ borderColor: "var(--bob-border)", background: "var(--bob-cream)" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
            handleFile({ target: inputRef.current } as React.ChangeEvent<HTMLInputElement>);
          }
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--bob-charcoal)" }}>
          {fileName ?? "Click or drag a CSV file here"}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--bob-gray)" }}>
          Columns: <code>name, value, close_date, rep_email, stage</code>
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />

      {loading && (
        <p className="text-sm" style={{ color: "var(--bob-gray)" }}>Importing…</p>
      )}
      {result && (
        <p className="text-sm" style={{ color: result.startsWith("Error") ? "var(--bob-burgundy)" : "var(--bob-gray)" }}>
          {result}
        </p>
      )}

      <details className="text-xs" style={{ color: "var(--bob-gray)" }}>
        <summary className="cursor-pointer font-medium">Download sample CSV</summary>
        <pre className="mt-2 p-3 rounded-lg overflow-x-auto text-xs" style={{ background: "var(--bob-gray-light)" }}>
{`name,value,close_date,rep_email,stage
Acme Corp Enterprise,85000,2026-04-10,rep1@company.com,Closed Won
Globex Annual License,45000,2026-04-15,rep2@company.com,Closed Won
Initech Pro Plan,22000,2026-04-20,rep1@company.com,Closed Won`}
        </pre>
      </details>
    </div>
  );
}
