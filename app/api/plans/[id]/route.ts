import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  effectiveTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.commissionPlan.findUnique({
    where: { id },
    include: {
      rules: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.effectiveTo) {
    data.effectiveTo = new Date(parsed.data.effectiveTo);
  }

  const plan = await prisma.commissionPlan.update({
    where: { id },
    data,
    include: { rules: true },
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.commissionPlan.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
