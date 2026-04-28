"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DisputeForm } from "./DisputeForm";

interface CommissionRow {
  id: string;
  dealId: string;
  userId: string;
  amount: number;
  rate: number;
  attainmentPct: number;
  status: string;
  deal: { title: string; value: number; closeDate: string };
  user: { id: string; name: string; email: string };
  dispute: { id: string; status: string } | null;
}

interface PeriodActionsProps {
  periodId: string;
  commissions: CommissionRow[];
  userRole: string;
  userId: string;
  approvals: Array<{
    repId: string;
    status: string;
    repSignedAt: string | null;
    managerSignedAt: string | null;
    rep: { id: string; name: string; email: string };
  }>;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    APPROVED: "bg-emerald-50 text-emerald-700",
    DISPUTED: "bg-red-50 text-red-700",
    PAID: "bg-indigo-50 text-indigo-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
};

export function PeriodActions({
  periodId,
  commissions,
  userRole,
  userId,
  approvals,
}: PeriodActionsProps) {
  const router = useRouter();
  const [disputingRecord, setDisputingRecord] = useState<CommissionRow | null>(null);
  const [loadingApprove, setLoadingApprove] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);

  const myApproval = approvals.find((a) => a.repId === userId);
  const isRep = userRole === "REP";
  const isManager = ["ADMIN", "MANAGER"].includes(userRole);

  async function handleApprove(repId: string) {
    setLoadingApprove(repId);
    await fetch(`/api/periods/${periodId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repId }),
    });
    setLoadingApprove(null);
    router.refresh();
  }

  async function handleSignOff() {
    await fetch(`/api/periods/${periodId}/sign-off`, { method: "POST" });
    setSignedOff(true);
    router.refresh();
  }

  // Group commissions by rep for manager view
  const byRep = commissions.reduce<Record<string, CommissionRow[]>>((acc, c) => {
    (acc[c.userId] = acc[c.userId] ?? []).push(c);
    return acc;
  }, {});

  return (
    <div>
      {isRep && !myApproval?.repSignedAt && !signedOff && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            Please review your commissions below and sign off to confirm accuracy.
          </p>
          <button
            onClick={handleSignOff}
            className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors ml-4 shrink-0"
          >
            Sign Off
          </button>
        </div>
      )}

      {isManager && Object.entries(byRep).map(([repId, records]) => {
        const rep = records[0]?.user;
        const approval = approvals.find((a) => a.repId === repId);
        const total = records.reduce((s, r) => s + r.amount, 0);
        const isApproved = approval?.status === "APPROVED";

        return (
          <div key={repId} className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{rep?.name}</p>
                <p className="text-xs text-gray-500">{rep?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                {isApproved ? (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                    Approved
                  </span>
                ) : (
                  <button
                    disabled={loadingApprove === repId}
                    onClick={() => handleApprove(repId)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingApprove === repId ? "Approving..." : "Approve"}
                  </button>
                )}
              </div>
            </div>
            <CommissionTable records={records} isRep={false} onDispute={setDisputingRecord} />
          </div>
        );
      })}

      {isRep && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <CommissionTable records={commissions} isRep onDispute={setDisputingRecord} />
        </div>
      )}

      {disputingRecord && (
        <DisputeForm
          commissionRecordId={disputingRecord.id}
          dealTitle={disputingRecord.deal.title}
          amount={disputingRecord.amount}
          onClose={() => setDisputingRecord(null)}
        />
      )}
    </div>
  );
}

function CommissionTable({
  records,
  isRep,
  onDispute,
}: {
  records: CommissionRow[];
  isRep: boolean;
  onDispute: (r: CommissionRow) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="text-left px-4 py-2 font-medium text-gray-600">Deal</th>
          <th className="text-right px-4 py-2 font-medium text-gray-600">Value</th>
          <th className="text-right px-4 py-2 font-medium text-gray-600">Rate</th>
          <th className="text-right px-4 py-2 font-medium text-gray-600">Commission</th>
          <th className="text-right px-4 py-2 font-medium text-gray-600">Status</th>
          {isRep && <th className="px-4 py-2"></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {records.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium">{r.deal.title}</td>
            <td className="px-4 py-3 text-right">
              ${r.deal.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
            <td className="px-4 py-3 text-right">{(r.rate * 100).toFixed(1)}%</td>
            <td className="px-4 py-3 text-right font-medium text-emerald-600">
              ${r.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
            <td className="px-4 py-3 text-right">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                {r.status}
              </span>
            </td>
            {isRep && (
              <td className="px-4 py-3 text-right">
                {r.status !== "DISPUTED" && r.status !== "PAID" && (
                  <button
                    onClick={() => onDispute(r)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Dispute
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
