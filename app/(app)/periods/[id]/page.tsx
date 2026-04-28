import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PeriodActions } from "@/components/periods/PeriodActions";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-gray-100 text-gray-600",
};

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const period = await prisma.commissionPeriod.findUnique({
    where: { id },
    include: {
      commissions: {
        include: {
          deal: true,
          user: { select: { id: true, name: true, email: true } },
          dispute: { select: { id: true, status: true } },
        },
        orderBy: [{ userId: "asc" }, { calculatedAt: "desc" }],
      },
      approvals: {
        include: {
          rep: { select: { id: true, name: true, email: true } },
          manager: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!period) notFound();

  const isRep = session.user.role === "REP";
  const commissions = isRep
    ? period.commissions.filter((c) => c.userId === session.user.id)
    : period.commissions;

  const approvals = isRep
    ? period.approvals.filter((a) => a.repId === session.user.id)
    : period.approvals;

  const totalAmount = commissions.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{period.name}</h1>
          <p className="text-gray-500 mt-1">
            {format(period.startDate, "MMM d")} – {format(period.endDate, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[period.status] ?? ""}`}
          >
            {period.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Commission Records</p>
          <p className="text-3xl font-bold mt-1">{commissions.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Commissions</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">
            ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Approvals</p>
          <p className="text-3xl font-bold mt-1">
            {approvals.filter((a) => a.status === "APPROVED").length} /{" "}
            {approvals.length}
          </p>
        </div>
      </div>

      <PeriodActions
        periodId={period.id}
        commissions={commissions.map((c) => ({
          ...c,
          deal: {
            ...c.deal,
            closeDate: c.deal.closeDate.toISOString(),
          },
          dispute: c.dispute,
        }))}
        userRole={session.user.role}
        userId={session.user.id}
        approvals={approvals.map((a) => ({
          ...a,
          repSignedAt: a.repSignedAt?.toISOString() ?? null,
          managerSignedAt: a.managerSignedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
