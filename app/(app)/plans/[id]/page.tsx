import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const plan = await prisma.commissionPlan.findUnique({
    where: { id },
    include: {
      rules: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!plan) notFound();

  const rule = plan.rules[0];
  const tiers = rule?.tiers as Array<{ fromPct: number; toPct: number | null; rate: number }> ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
          {plan.description && (
            <p className="text-gray-500 mt-1">{plan.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
            {plan.type}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {plan.periodType}
          </span>
        </div>
      </div>

      {/* Rule Summary */}
      {rule && (
        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Commission Structure</h2>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-500">Quota Target</p>
              <p className="text-xl font-bold">{plan.currency} {rule.quotaTarget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Rate</p>
              <p className="text-xl font-bold">{(rule.baseRate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ramp Period</p>
              <p className="text-xl font-bold">
                {rule.rampMonths === 0 ? "None" : `${rule.rampMonths} months`}
              </p>
            </div>
          </div>

          {tiers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Accelerator Tiers</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left py-1">Attainment</th>
                    <th className="text-left py-1">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tiers.map((tier, i) => (
                    <tr key={i}>
                      <td className="py-2">
                        {tier.fromPct}% – {tier.toPct !== null ? `${tier.toPct}%` : "∞"}
                      </td>
                      <td className="py-2 font-medium text-indigo-700">
                        {(tier.rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Validity */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Validity</h2>
        <div className="flex gap-8 text-sm">
          <div>
            <p className="text-gray-500">From</p>
            <p className="font-medium">{format(plan.effectiveFrom, "MMM d, yyyy")}</p>
          </div>
          {plan.effectiveTo && (
            <div>
              <p className="text-gray-500">To</p>
              <p className="font-medium">{format(plan.effectiveTo, "MMM d, yyyy")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Assigned Reps */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            Assigned Reps ({plan.assignments.length})
          </h2>
          {session?.user.role === "ADMIN" && (
            <a
              href={`/api/plans/${plan.id}/assign`}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              + Assign rep
            </a>
          )}
        </div>

        {plan.assignments.length === 0 ? (
          <p className="text-sm text-gray-400">No reps assigned yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100">
                <th className="text-left pb-2">Rep</th>
                <th className="text-left pb-2">Quota Override</th>
                <th className="text-left pb-2">From</th>
                <th className="text-left pb-2">To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {plan.assignments.map((a) => (
                <tr key={a.id}>
                  <td className="py-2">
                    <p className="font-medium">{a.user.name}</p>
                    <p className="text-gray-400 text-xs">{a.user.email}</p>
                  </td>
                  <td className="py-2">
                    {a.quotaOverride
                      ? `${plan.currency} ${a.quotaOverride.toLocaleString()}`
                      : "Default"}
                  </td>
                  <td className="py-2">{format(a.startDate, "MMM d, yyyy")}</td>
                  <td className="py-2">
                    {a.endDate ? format(a.endDate, "MMM d, yyyy") : "Ongoing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
