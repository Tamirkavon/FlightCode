import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";
import Link from "next/link";

async function getRepData(userId: string) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const period = await prisma.commissionPeriod.findFirst({
    where: { startDate: { lte: periodEnd }, endDate: { gte: periodStart } },
    orderBy: { startDate: "desc" },
  });

  const assignment = await prisma.planAssignment.findFirst({
    where: {
      userId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: { plan: { include: { rules: true } } },
    orderBy: { startDate: "desc" },
  });

  const quota = assignment?.quotaOverride ?? assignment?.plan.rules[0]?.quotaTarget ?? 0;

  const deals = await prisma.deal.findMany({
    where: { repId: userId, closeDate: { gte: periodStart, lte: periodEnd } },
    include: { commissions: period ? { where: { periodId: period.id } } : false },
    orderBy: { closeDate: "desc" },
    take: 10,
  });

  const revenue = deals.reduce((s, d) => s + d.value, 0);
  const earned = deals.reduce(
    (s, d) => s + (Array.isArray(d.commissions) ? d.commissions.reduce((cs, c) => cs + c.amount, 0) : 0),
    0
  );
  const attainmentPct = quota > 0 ? (revenue / quota) * 100 : 0;

  return { quota, revenue, earned, attainmentPct, deals, period };
}

async function getManagerData(managerId: string) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const reports = await prisma.user.findMany({
    where: { managerId },
    select: {
      id: true, name: true, email: true,
      planAssignments: {
        where: { startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
        include: { plan: { include: { rules: true } } },
        take: 1, orderBy: { startDate: "desc" },
      },
      commissions: {
        where: { period: { startDate: { lte: periodEnd }, endDate: { gte: periodStart } } },
        select: { amount: true },
      },
      deals: {
        where: { closeDate: { gte: periodStart, lte: periodEnd } },
        select: { value: true },
      },
    },
  });

  const team = reports.map((rep) => {
    const quota = rep.planAssignments[0]?.quotaOverride ?? rep.planAssignments[0]?.plan.rules[0]?.quotaTarget ?? 0;
    const revenue = rep.deals.reduce((s, d) => s + d.value, 0);
    const earned = rep.commissions.reduce((s, c) => s + c.amount, 0);
    const attainmentPct = quota > 0 ? (revenue / quota) * 100 : 0;
    return { ...rep, quota, revenue, earned, attainmentPct };
  });

  const totalLiability = team.reduce((s, r) => s + r.earned, 0);
  return { team, totalLiability };
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function attainColor(pct: number) {
  if (pct >= 100) return "#10b981";
  if (pct >= 70) return "#f59e0b";
  return "#ef4444";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const isManager = ["ADMIN", "MANAGER"].includes(session.user.role);
  const monthLabel = format(new Date(), "MMMM yyyy");

  // ── MANAGER VIEW ──
  if (isManager) {
    const { team, totalLiability } = await getManagerData(session.user.id);

    return (
      <div>
        <PageHeader title={`Team Dashboard`} sub={monthLabel} />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="Commission liability" value={`$${fmt(totalLiability)}`} />
          <StatCard
            label="Reps on track (≥ 70%)"
            value={`${team.filter((r) => r.attainmentPct >= 70).length} / ${team.length}`}
          />
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bob-border)" }}>
                {["Rep", "Revenue", "Quota", "Attainment", "Earned"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 text-xs font-semibold ${i === 0 ? "text-left px-4" : "text-right px-4"}`}
                    style={{ color: "var(--bob-gray)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10" style={{ color: "var(--bob-gray)" }}>
                    No reports assigned yet.
                  </td>
                </tr>
              ) : (
                team.map((rep) => (
                  <tr key={rep.id} style={{ borderBottom: "1px solid var(--bob-border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "var(--bob-charcoal)" }}>{rep.name}</p>
                      <p className="text-xs" style={{ color: "var(--bob-gray)" }}>{rep.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--bob-charcoal)" }}>${fmt(rep.revenue)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--bob-gray)" }}>${fmt(rep.quota)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: attainColor(rep.attainmentPct) }}>
                      {rep.attainmentPct.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--bob-charcoal)" }}>
                      ${fmt(rep.earned)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // ── REP VIEW ──
  const { quota, revenue, earned, attainmentPct, deals } = await getRepData(session.user.id);
  const color = attainColor(attainmentPct);
  const pctClamped = Math.min(attainmentPct, 100);

  return (
    <div>
      <PageHeader title={`My Dashboard`} sub={monthLabel} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Quota attainment"
          value={`${attainmentPct.toFixed(0)}%`}
          valueColor={color}
          sub={`$${fmt(revenue)} of $${fmt(quota)}`}
        />
        <StatCard label="Commission earned" value={`$${fmt(earned)}`} valueColor="var(--bob-pink)" />
        <StatCard label="Deals closed" value={String(deals.length)} />
      </div>

      {/* Progress bar */}
      <Card className="mb-4 p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium" style={{ color: "var(--bob-charcoal)" }}>Quota progress</span>
          <span className="font-semibold" style={{ color }}>{attainmentPct.toFixed(0)}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bob-gray-light)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctClamped}%`, background: color }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5" style={{ color: "var(--bob-gray)" }}>
          <span>$0</span>
          <span>${fmt(quota)}</span>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--bob-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--bob-charcoal)" }}>Recent Deals</h2>
          <Link href="/deals" className="text-sm font-medium" style={{ color: "var(--bob-pink)" }}>
            View all →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--bob-border)" }}>
              {["Deal", "Value", "Close Date", "Commission"].map((h, i) => (
                <th
                  key={h}
                  className={`py-2 text-xs font-semibold ${i === 0 ? "text-left px-4" : "text-right px-4"}`}
                  style={{ color: "var(--bob-gray)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8" style={{ color: "var(--bob-gray)" }}>
                  No deals yet this month. Upload data in the Data section.
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const commission = Array.isArray(deal.commissions)
                  ? deal.commissions.reduce((s, c) => s + c.amount, 0)
                  : 0;
                return (
                  <tr key={deal.id} style={{ borderBottom: "1px solid var(--bob-border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--bob-charcoal)" }}>{deal.title}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--bob-charcoal)" }}>${fmt(deal.value)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--bob-gray)" }}>{format(deal.closeDate, "MMM d")}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--bob-pink)" }}>
                      {commission > 0 ? `$${fmt(commission)}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--bob-charcoal)", fontFamily: "var(--font-serif)" }}>
        {title}
      </h1>
      <p className="text-sm mt-0.5" style={{ color: "var(--bob-gray)" }}>{sub}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid var(--bob-border)" }}>
      <p className="text-sm" style={{ color: "var(--bob-gray)" }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: valueColor ?? "var(--bob-charcoal)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--bob-gray)" }}>{sub}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ background: "#fff", border: "1px solid var(--bob-border)" }}
    >
      {children}
    </div>
  );
}
