import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function PlansPage() {
  const session = await auth();

  const plans = await prisma.commissionPlan.findMany({
    where: { isActive: true },
    include: {
      rules: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commission Plans</h1>
        {session?.user.role === "ADMIN" && (
          <Link
            href="/plans/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            New Plan
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No plans yet</p>
          <p className="text-sm mt-1">Create your first commission plan to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {plan.type}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {plan.periodType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {plan._count.assignments} rep{plan._count.assignments !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>From {format(plan.effectiveFrom, "MMM d, yyyy")}</p>
                  {plan.effectiveTo && (
                    <p>To {format(plan.effectiveTo, "MMM d, yyyy")}</p>
                  )}
                </div>
              </div>
              {plan.rules[0] && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Quota target</span>
                    <p className="font-medium">
                      {plan.currency}{" "}
                      {plan.rules[0].quotaTarget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Base rate</span>
                    <p className="font-medium">
                      {(plan.rules[0].baseRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tiers</span>
                    <p className="font-medium">
                      {(plan.rules[0].tiers as unknown[]).length} configured
                    </p>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
