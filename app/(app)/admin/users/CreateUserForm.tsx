"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Manager {
  id: string;
  name: string;
}

export function CreateUserForm({ managers }: { managers: Manager[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "REP",
    managerId: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, string> = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
    };
    if (form.managerId) body.managerId = form.managerId;

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(JSON.stringify(data.error));
      return;
    }

    setForm({ name: "", email: "", password: "", role: "REP", managerId: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
        <select
          value={form.role}
          onChange={(e) => set("role", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="REP">Rep</option>
          <option value="MANAGER">Manager</option>
          <option value="FINANCE">Finance</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {form.role === "REP" && managers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Manager</label>
          <select
            value={form.managerId}
            onChange={(e) => set("managerId", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">None</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-1"
      >
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
