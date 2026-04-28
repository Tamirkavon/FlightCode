import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get("periodId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};

  if (session.user.role === "REP") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (periodId) where.periodId = periodId;

  const records = await prisma.commissionRecord.findMany({
    where,
    include: {
      deal: true,
      user: { select: { id: true, name: true, email: true } },
      period: true,
      dispute: true,
    },
    orderBy: { calculatedAt: "desc" },
  });

  return NextResponse.json(records);
}
