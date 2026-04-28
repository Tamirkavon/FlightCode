import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const periodSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const periods = await prisma.commissionPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { commissions: true, approvals: true } },
    },
  });

  return NextResponse.json(periods);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = periodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const period = await prisma.commissionPeriod.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });

  return NextResponse.json(period, { status: 201 });
}
