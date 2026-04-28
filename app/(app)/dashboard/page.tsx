import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";
import Link from "next/link";

async function getRepDashboardData(userId: string) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const period = await prisma.commissionPeriod.findFirst({
    where: {
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
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
    where: {
      repId: userId,
      closeDate: { gte: periodStart, lte: periodEnd },
    },
    include: {
      commissions: period ? { where: { periodId: period.id } } : false,
    },
    orderBy: { closeDate: "desc" },
    take: 10,
  });

  const periodRevenue = deals.reduce((sum, d) => sum + d.value, 0);
  const earned = deals.reduce(
    (sum, d) =>
      sum +
      (Array.isArray(d.commissions)
        ? d.commissions.reduce((s, c) => s + c.amount, 0)
        : 0),
    0
  );

  const attainmentPct = quota > 0 ? (periodRevenue / quota) * 100 : 0;

  return { quota, periodRevenue, earned, attainmentPct, deals, period };
}

async function getManagerDashboardData(managerId: string) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const reports = await prisma.user.findMany({
    where: { managerId },
    select: {
      id: true,
      name: true,
      email: true,
      planAssignments: {
        where: {
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        include: { plan: { include: { rules: true } } },
        take: 1,
        orderBy: { startDate: "desc" },
      },
      commissions: {
        where: {
          period: {
            startDate: { lte: periodEnd },
            endDate: { gte: periodStart },
          },
        },
        select: { amount: true },
      },
      deals: {
        where: { closeDate: { gte: periodStart, lte: periodEnd } },
        select: { value: true },
      },
    },
  });

  const teamData = reports.map((rep) => {
    const quota =
      rep.planAssignments[0]?.quotaOverride ??
      rep.planAssignments[0]?.plan.rules[0]?.quotaTarget ??
      0;
    const revenue = rep.deals.reduce((s, d) => s + d.value, 0);
    const earned = rep.commissions.reduce((s, c) => s + c.amount, 0);
    const attainmentPct = quota > 0 ? (revenue / quota) * 100 : 0;
    return { ...rep, quota, revenue, earned, attainmentPct };
  });

  const totalLiability = teamData.reduce((s, r) => s + r.earned, 0);

  return { teamData, totalLiability };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const isManager = ["ADMIN", "MANAGER"].includes(session.user.role);

  if (isManager) {
    const { teamData, totalLiability } = await getManagerDashboardData(
      session.user.id
    );

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Team Dashboard — {format(new Date(), "MMMM yyyy")}
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Total Commission Liability</p>
            <p className="text-3xl font-bold mt-1">
              ${totalLiability.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Reps On Track (≥ 70%)</p>
            <p className="text-3xl font-bold mt-1">
              {teamData.filter((r) => r.attainmentPct >= 70).length} /{" "}
              {teamData.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rep</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Quota</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Attainment</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No reports assigned yet.
                  </td>
                </tr>
              ) : (
                teamData.map((rep) => {
                  const color =
                    rep.attainmentPct >= 100
                      ? "text-emerald-600"
                      : rep.attainmentPct >= 70
                      ? "text-amber-600"
                      : "text-red-600";
                  return (
                    <tr key={rep.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{rep.name}</p>
                        <p className="text-xs text-gray-400">{rep.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${rep.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${rep.quota.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${color}`}>
                        {rep.attainmentPct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${rep.earned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // REP dashboard
  const { quota, periodRevenue, earned, attainmentPct, deals } =
    await getRepDashboardData(session.user.id);

  const color =
    attainmentPct >= 100
      ? "text-emerald-600"
      : attainmentPct >= 70
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        My Dashboard — {format(new Date(), "MMMM yyyy")}
      </h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Quota Attainment</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>
            {attainmentPct.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ${periodRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{" "}
            ${quota.toLocaleString(undefined, { maximumFractionDigits: 0 })} quota
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Commission Earned</p>
          <p className="text-3xl font-bold mt-1">
            ${earned.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Deals Closed</p>
          <p className="text-3xl font-bold mt-1">{deals.length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Deals</h2>
          <Link href="/deals" className="text-sm text-indigo-600 hover:text-indigo-800">
            View all
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Deal</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Value</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Close Date</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  No deals closed this month yet.
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const commission = Array.isArray(deal.commissions)
                  ? deal.commissions.reduce((s, c) => s + c.amount, 0)
                  : 0;
                return (
                  <tr key={deal.id}>
                    <td className="px-4 py-3 font-medium">{deal.title}</td>
                    <td className="px-4 py-3 text-right">
                      ${deal.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {format(deal.closeDate, "MMM d")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {commission > 0
                        ? `$${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
