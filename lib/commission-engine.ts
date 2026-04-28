import { prisma } from "@/lib/prisma";
import { differenceInMonths } from "date-fns";

interface Tier {
  fromPct: number;
  toPct: number | null;
  rate: number;
}

function findApplicableTier(tiers: Tier[], attainmentPct: number): number {
  for (const tier of tiers) {
    if (
      attainmentPct >= tier.fromPct &&
      (tier.toPct === null || attainmentPct < tier.toPct)
    ) {
      return tier.rate;
    }
  }
  return 0;
}

function getRampFactor(rampMonths: number, repCreatedAt: Date, dealDate: Date): number {
  if (rampMonths === 0) return 1;
  const elapsed = differenceInMonths(dealDate, repCreatedAt);
  return Math.min(1, elapsed / rampMonths);
}

export async function calculateCommissionsForPeriod(periodId: string) {
  const period = await prisma.commissionPeriod.findUniqueOrThrow({
    where: { id: periodId },
  });

  const deals = await prisma.deal.findMany({
    where: {
      closeDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    include: { rep: true },
  });

  for (const deal of deals) {
    await calculateDealCommission(deal.id, periodId);
  }
}

export async function calculateDealCommission(dealId: string, periodId: string) {
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: dealId },
    include: { rep: true },
  });

  const period = await prisma.commissionPeriod.findUniqueOrThrow({
    where: { id: periodId },
  });

  // Find active plan assignment for this rep at deal close date
  const assignment = await prisma.planAssignment.findFirst({
    where: {
      userId: deal.repId,
      startDate: { lte: deal.closeDate },
      OR: [{ endDate: null }, { endDate: { gte: deal.closeDate } }],
    },
    include: { plan: { include: { rules: true } } },
    orderBy: { startDate: "desc" },
  });

  if (!assignment || assignment.plan.rules.length === 0) return;

  const rule = assignment.plan.rules[0];
  const effectiveQuota = assignment.quotaOverride ?? rule.quotaTarget;

  const rampFactor = getRampFactor(
    rule.rampMonths,
    deal.rep.createdAt,
    deal.closeDate
  );
  const rampedQuota = effectiveQuota * rampFactor;

  // Sum all deal revenue for this rep in this period (cumulative)
  const existingRevenue = await prisma.commissionRecord.aggregate({
    where: {
      userId: deal.repId,
      periodId,
      dealId: { not: dealId },
    },
    _sum: { amount: true },
  });

  // To get cumulative deal value, sum deals (not commission amounts)
  const periodDeals = await prisma.deal.findMany({
    where: {
      repId: deal.repId,
      closeDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    select: { id: true, value: true },
  });

  const priorRevenue = periodDeals
    .filter((d) => d.id !== dealId)
    .reduce((sum, d) => sum + d.value, 0);

  const totalRevenue = priorRevenue + deal.value;
  const attainmentPct = rampedQuota > 0 ? (totalRevenue / rampedQuota) * 100 : 0;

  const tiers = rule.tiers as unknown as Tier[];
  const rate = tiers.length > 0
    ? findApplicableTier(tiers, attainmentPct)
    : rule.baseRate;

  const commissionAmount = deal.value * rate;

  await prisma.commissionRecord.upsert({
    where: {
      dealId_userId_periodId: {
        dealId,
        userId: deal.repId,
        periodId,
      },
    },
    update: {
      amount: commissionAmount,
      rate,
      attainmentPct,
      planId: assignment.planId,
    },
    create: {
      dealId,
      userId: deal.repId,
      periodId,
      planId: assignment.planId,
      amount: commissionAmount,
      currency: deal.currency,
      rate,
      attainmentPct,
    },
  });
}
