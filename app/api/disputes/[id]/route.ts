import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resolveSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED", "UNDER_REVIEW"]),
  resolution: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dispute = await prisma.dispute.update({
    where: { id },
    data: parsed.data,
  });

  // If resolved/dismissed, reset commission status
  if (["RESOLVED", "DISMISSED"].includes(parsed.data.status)) {
    await prisma.commissionRecord.update({
      where: { id: dispute.commissionRecordId },
      data: { status: parsed.data.status === "RESOLVED" ? "APPROVED" : "PENDING" },
    });
  }

  return NextResponse.json(dispute);
}
