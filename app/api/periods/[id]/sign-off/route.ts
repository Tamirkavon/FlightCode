import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: periodId } = await params;

  const approval = await prisma.approvalRecord.upsert({
    where: { periodId_repId: { periodId, repId: session.user.id } },
    update: { repSignedAt: new Date() },
    create: {
      periodId,
      repId: session.user.id,
      repSignedAt: new Date(),
    },
  });

  return NextResponse.json(approval);
}
