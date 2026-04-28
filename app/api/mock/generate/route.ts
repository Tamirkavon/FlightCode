import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";

const COMPANY_NAMES = [
  "Acme Corp", "Globex Industries", "Initech", "Umbrella Corp",
  "Massive Dynamic", "Soylent Corp", "Virtucon", "Oceanic Airlines",
  "Rekall Inc", "Weyland Corp", "Tyrell Corp", "Cyberdyne Systems",
  "Oscorp", "LexCorp", "Wayne Enterprises", "Stark Industries",
  "Nakatomi Corp", "Pied Piper", "Hooli", "Raviga Capital",
];

const PLAN_TYPES = ["Enterprise", "Pro", "Starter", "Growth", "Team", "Annual"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dealValue(): number {
  const tier = Math.random();
  if (tier < 0.3) return rand(5000, 25000);
  if (tier < 0.7) return rand(25000, 75000);
  return rand(75000, 200000);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { months = 3 } = await req.json();

  const reps = await prisma.user.findMany({ where: { role: "REP" } });
  if (reps.length === 0) {
    return NextResponse.json({ error: "No sales reps found. Create reps first." }, { status: 400 });
  }

  const plan = await prisma.commissionPlan.findFirst({
    where: { isActive: true },
    include: { rules: true },
  });

  let dealsCreated = 0;
  let periodsCreated = 0;
  const usedNames = new Set<string>();

  for (let m = months - 1; m >= 0; m--) {
    const now = new Date();
    const periodStart = startOfMonth(subMonths(now, m));
    const periodEnd = endOfMonth(subMonths(now, m));

    const periodName = periodStart.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const period = await prisma.commissionPeriod.upsert({
      where: { id: `mock-period-${m}` },
      update: {},
      create: {
        id: `mock-period-${m}`,
        name: periodName,
        type: "MONTHLY",
        startDate: periodStart,
        endDate: periodEnd,
        status: m === 0 ? "OPEN" : "APPROVED",
      },
    });

    if (period) periodsCreated++;

    for (const rep of reps) {
      const dealsThisMonth = rand(2, 6);

      for (let d = 0; d < dealsThisMonth; d++) {
        let company = pick(COMPANY_NAMES);
        let attempt = 0;
        while (usedNames.has(company) && attempt < 10) {
          company = `${pick(COMPANY_NAMES)} ${rand(2, 99)}`;
          attempt++;
        }
        usedNames.add(company);

        const title = `${company} — ${pick(PLAN_TYPES)}`;
        const value = dealValue();
        const closeDate = addDays(periodStart, rand(1, 28));
        const crmId = `mock-${rep.id.slice(0, 6)}-${m}-${d}`;

        const deal = await prisma.deal.upsert({
          where: { crmId },
          update: { title, value, closeDate },
          create: {
            crmId,
            title,
            value,
            currency: "USD",
            closeDate,
            stage: "Closed Won",
            repId: rep.id,
          },
        });

        dealsCreated++;

        if (plan && plan.rules[0]) {
          const rule = plan.rules[0];
          const quota = rule.quotaTarget;
          const tiers = rule.tiers as Array<{ fromPct: number; toPct: number | null; rate: number }>;

          const priorDeals = await prisma.deal.findMany({
            where: {
              repId: rep.id,
              closeDate: { gte: periodStart, lte: closeDate },
              id: { not: deal.id },
            },
            select: { value: true },
          });
          const priorRevenue = priorDeals.reduce((s, dd) => s + dd.value, 0);
          const cumRevenue = priorRevenue + value;
          const attainmentPct = quota > 0 ? (cumRevenue / quota) * 100 : 0;

          const tier =
            tiers.length > 0
              ? tiers.find(
                  (t) =>
                    attainmentPct >= t.fromPct &&
                    (t.toPct === null || attainmentPct < t.toPct)
                ) ?? tiers[0]
              : null;

          const rate = tier?.rate ?? rule.baseRate;

          await prisma.commissionRecord.upsert({
            where: {
              dealId_userId_periodId: {
                dealId: deal.id,
                userId: rep.id,
                periodId: period.id,
              },
            },
            update: { amount: value * rate, rate, attainmentPct },
            create: {
              dealId: deal.id,
              userId: rep.id,
              periodId: period.id,
              planId: plan.id,
              amount: value * rate,
              currency: "USD",
              rate,
              attainmentPct,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ deals: dealsCreated, periods: periodsCreated });
}
