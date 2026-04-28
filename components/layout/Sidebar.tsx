"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/app/generated/prisma/client";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Deals", href: "/deals", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Periods", href: "/periods", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Commission Plans", href: "/plans", roles: ["ADMIN", "MANAGER", "FINANCE"] },
  { label: "Integrations", href: "/integrations", roles: ["ADMIN"] },
  { label: "Users", href: "/admin/users", roles: ["ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight">CommissionOS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
