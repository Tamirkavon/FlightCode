import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-gray-100 text-gray-600",
};

export default async function PeriodsPage() {
  const session = await auth();
  if (!session) return null;

  const periods = await prisma.commissionPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { commissions: true, approvals: true } },
    },
  });

  const totalEarned = await prisma.commissionRecord.aggregate({
    _sum: { amount: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commission Periods</h1>
        {["ADMIN", "FINANCE"].includes(session.user.role) && (
          <NewPeriodButton />
        )}
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No periods yet</p>
          <p className="text-sm mt-1">Create a period to start the approval cycle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <Link
              key={period.id}
              href={`/periods/${period.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <h2 className="font-semibold text-gray-900">{period.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(period.startDate, "MMM d")} –{" "}
                  {format(period.endDate, "MMM d, yyyy")}
                </p>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>{period._count.commissions} commission records</span>
                  <span>{period._count.approvals} approvals</span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[period.status] ?? ""}`}
              >
                {period.status.replace("_", " ")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPeriodButton() {
  return (
    <form action="/api/periods" method="GET">
      <Link
        href="#"
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        id="new-period-btn"
      >
        New Period
      </Link>
    </form>
  );
}
