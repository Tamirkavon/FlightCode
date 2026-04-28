import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  repId: z.string(),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: periodId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const approval = await prisma.approvalRecord.upsert({
    where: { periodId_repId: { periodId, repId: parsed.data.repId } },
    update: {
      status: "APPROVED",
      managerId: session.user.id,
      managerSignedAt: new Date(),
      notes: parsed.data.notes,
    },
    create: {
      periodId,
      repId: parsed.data.repId,
      managerId: session.user.id,
      status: "APPROVED",
      managerSignedAt: new Date(),
      notes: parsed.data.notes,
    },
  });

  // Update corresponding commission records to APPROVED
  await prisma.commissionRecord.updateMany({
    where: {
      periodId,
      userId: parsed.data.repId,
      status: "PENDING",
    },
    data: { status: "APPROVED" },
  });

  return NextResponse.json(approval);
}
