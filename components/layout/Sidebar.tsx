"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/app/generated/prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard",    icon: "◈", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Deals",            href: "/deals",        icon: "◆", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Periods",          href: "/periods",      icon: "◉", roles: ["ADMIN", "MANAGER", "REP", "FINANCE"] },
  { label: "Commission Plans", href: "/plans",        icon: "◇", roles: ["ADMIN", "MANAGER", "FINANCE"] },
  { label: "Integrations",     href: "/integrations", icon: "◎", roles: ["ADMIN"] },
  { label: "Users",            href: "/admin/users",  icon: "◐", roles: ["ADMIN"] },
];

const roleLabel: Record<Role, string> = {
  ADMIN:   "Admin",
  MANAGER: "Manager",
  REP:     "Sales Rep",
  FINANCE: "Finance",
};

export function Sidebar({ role, name }: { role: Role; name?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 min-h-screen flex flex-col"
      style={{ background: "var(--bob-charcoal)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-1.5 font-bold" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span
          className="text-white text-sm font-bold px-2 py-1 leading-none"
          style={{
            background: "var(--bob-pink)",
            borderRadius: "7px 7px 7px 2px",
          }}
        >
          Hi
        </span>
        <span className="text-white text-xl leading-none tracking-tight">Bob</span>
        <span
          className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(227,28,121,0.18)", color: "var(--bob-pink)" }}
        >
          Comm
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "var(--bob-pink)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* User + sign out */}
      <div
        className="px-3 pb-4 pt-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {name && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white truncate">{name}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {roleLabel[role]}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <span style={{ fontSize: "0.7rem" }}>→</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
