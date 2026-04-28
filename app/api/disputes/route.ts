import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  commissionRecordId: z.string(),
  reason: z.string().min(10),
  evidence: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    session.user.role === "REP" ? { repId: session.user.id } : {};

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      rep: { select: { id: true, name: true, email: true } },
      commissionRecord: { include: { deal: true, period: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(disputes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify this commission record belongs to the rep
  if (session.user.role === "REP") {
    const record = await prisma.commissionRecord.findUnique({
      where: { id: parsed.data.commissionRecordId },
    });
    if (!record || record.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const dispute = await prisma.dispute.create({
    data: {
      ...parsed.data,
      repId: session.user.id,
    },
  });

  // Mark commission as DISPUTED
  await prisma.commissionRecord.update({
    where: { id: parsed.data.commissionRecordId },
    data: { status: "DISPUTED" },
  });

  return NextResponse.json(dispute, { status: 201 });
}
