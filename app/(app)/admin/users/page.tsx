import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CreateUserForm } from "./CreateUserForm";

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700",
  MANAGER: "bg-indigo-50 text-indigo-700",
  REP: "bg-blue-50 text-blue-700",
  FINANCE: "bg-amber-50 text-amber-700",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
      manager: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <div className="grid grid-cols-[1fr_380px] gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Manager</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] ?? ""}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.manager?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(user.createdAt, "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Add User</h2>
          <CreateUserForm
            managers={users.filter((u) =>
              ["ADMIN", "MANAGER"].includes(u.role)
            )}
          />
        </div>
      </div>
    </div>
  );
}
