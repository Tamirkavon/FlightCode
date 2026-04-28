import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const period = await prisma.commissionPeriod.findUnique({
    where: { id },
    include: {
      commissions: {
        include: {
          deal: true,
          user: { select: { id: true, name: true, email: true } },
          dispute: true,
        },
      },
      approvals: {
        include: {
          rep: { select: { id: true, name: true, email: true } },
          manager: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // REPs only see their own commissions
  if (session.user.role === "REP") {
    period.commissions = period.commissions.filter(
      (c) => c.userId === session.user.id
    );
    period.approvals = period.approvals.filter(
      (a) => a.repId === session.user.id
    );
  }

  return NextResponse.json(period);
}
