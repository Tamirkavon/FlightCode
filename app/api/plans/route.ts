import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "TEAM"]).default("INDIVIDUAL"),
  currency: z.string().default("USD"),
  periodType: z.enum(["MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  rules: z.array(z.object({
    metric: z.enum(["REVENUE", "DEALS_CLOSED", "CUSTOM"]).default("REVENUE"),
    quotaTarget: z.number().positive(),
    baseRate: z.number().min(0).max(1),
    rampMonths: z.number().int().min(0).default(0),
    tiers: z.array(z.object({
      fromPct: z.number(),
      toPct: z.number().nullable(),
      rate: z.number(),
    })).default([]),
  })).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.commissionPlan.findMany({
    where: { isActive: true },
    include: {
      rules: true,
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rules, ...planData } = parsed.data;

  const plan = await prisma.commissionPlan.create({
    data: {
      ...planData,
      effectiveFrom: new Date(planData.effectiveFrom),
      effectiveTo: planData.effectiveTo ? new Date(planData.effectiveTo) : null,
      rules: {
        create: rules.map((r) => ({
          metric: r.metric,
          quotaTarget: r.quotaTarget,
          baseRate: r.baseRate,
          rampMonths: r.rampMonths,
          tiers: r.tiers,
        })),
      },
    },
    include: { rules: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
