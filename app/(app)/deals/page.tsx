import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function DealsPage() {
  const session = await auth();
  if (!session) return null;

  const where =
    session.user.role === "REP" ? { repId: session.user.id } : {};

  const deals = await prisma.deal.findMany({
    where,
    include: {
      rep: { select: { id: true, name: true } },
      commissions: { select: { amount: true, currency: true, rate: true, attainmentPct: true } },
    },
    orderBy: { closeDate: "desc" },
    take: 100,
  });

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const totalCommission = deals.reduce(
    (s, d) => s + d.commissions.reduce((cs, c) => cs + c.amount, 0),
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Deals</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Deals</p>
          <p className="text-3xl font-bold mt-1">{deals.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold mt-1">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Commission</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">
            ${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Deal</th>
              {session.user.role !== "REP" && (
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rep</th>
              )}
              <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Close Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Rate</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No deals found. Connect Salesforce to sync deals.
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const earned = deal.commissions.reduce((s, c) => s + c.amount, 0);
                const rate = deal.commissions[0]?.rate;
                return (
                  <tr key={deal.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{deal.title}</p>
                      <p className="text-xs text-gray-400">{deal.stage}</p>
                    </td>
                    {session.user.role !== "REP" && (
                      <td className="px-4 py-3 text-gray-600">{deal.rep.name}</td>
                    )}
                    <td className="px-4 py-3 text-right font-medium">
                      {deal.currency} {deal.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {format(deal.closeDate, "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {rate != null ? `${(rate * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {earned > 0
                        ? `$${earned.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
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
