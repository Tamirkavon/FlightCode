import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { startOfMonth, endOfMonth } from "date-fns";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("Seeding database...");

  const adminPw = await bcrypt.hash("admin1234", 12);
  const userPw = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: { email: "admin@company.com", name: "Alex Admin", role: "ADMIN", password: adminPw },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@company.com" },
    update: {},
    create: {
      email: "manager@company.com",
      name: "Maria Manager",
      role: "MANAGER",
      password: userPw,
      managerId: admin.id,
    },
  });

  const rep1 = await prisma.user.upsert({
    where: { email: "rep1@company.com" },
    update: {},
    create: {
      email: "rep1@company.com",
      name: "Sam Sales",
      role: "REP",
      password: userPw,
      managerId: manager.id,
    },
  });

  const rep2 = await prisma.user.upsert({
    where: { email: "rep2@company.com" },
    update: {},
    create: {
      email: "rep2@company.com",
      name: "Jordan Revenue",
      role: "REP",
      password: userPw,
      managerId: manager.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "finance@company.com" },
    update: {},
    create: {
      email: "finance@company.com",
      name: "Finance Team",
      role: "FINANCE",
      password: userPw,
    },
  });

  const plan = await prisma.commissionPlan.upsert({
    where: { id: "plan-ae-2026" },
    update: {},
    create: {
      id: "plan-ae-2026",
      name: "AE Standard Plan 2026",
      description: "Account Executive commission plan with accelerators",
      type: "INDIVIDUAL",
      currency: "USD",
      periodType: "MONTHLY",
      effectiveFrom: new Date("2026-01-01"),
      rules: {
        create: {
          metric: "REVENUE",
          quotaTarget: 100000,
          baseRate: 0.05,
          rampMonths: 0,
          tiers: [
            { fromPct: 0, toPct: 75, rate: 0.03 },
            { fromPct: 75, toPct: 100, rate: 0.05 },
            { fromPct: 100, toPct: 125, rate: 0.08 },
            { fromPct: 125, toPct: null, rate: 0.12 },
          ],
        },
      },
    },
  });

  for (const rep of [rep1, rep2]) {
    await prisma.planAssignment.upsert({
      where: {
        userId_planId_startDate: {
          userId: rep.id,
          planId: plan.id,
          startDate: new Date("2026-01-01"),
        },
      },
      update: {},
      create: {
        userId: rep.id,
        planId: plan.id,
        startDate: new Date("2026-01-01"),
      },
    });
  }

  const now = new Date();
  const period = await prisma.commissionPeriod.upsert({
    where: { id: "period-current" },
    update: {},
    create: {
      id: "period-current",
      name: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
      type: "MONTHLY",
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
      status: "OPEN",
    },
  });

  const tiers = [
    { fromPct: 0, toPct: 75 as number | null, rate: 0.03 },
    { fromPct: 75, toPct: 100 as number | null, rate: 0.05 },
    { fromPct: 100, toPct: 125 as number | null, rate: 0.08 },
    { fromPct: 125, toPct: null as number | null, rate: 0.12 },
  ];

  function findRate(attainmentPct: number) {
    return (
      tiers.find(
        (t) =>
          attainmentPct >= t.fromPct &&
          (t.toPct === null || attainmentPct < t.toPct)
      ) ?? tiers[0]
    );
  }

  // Rep1 deals (~130% attainment)
  const deals1 = [
    { title: "Acme Corp — Enterprise License", value: 65000, daysBack: 15 },
    { title: "Globex — Annual Contract", value: 45000, daysBack: 10 },
    { title: "Initech — Starter Plan", value: 20000, daysBack: 5 },
  ];

  for (let i = 0; i < deals1.length; i++) {
    const d = deals1[i];
    const closeDate = new Date(now);
    closeDate.setDate(closeDate.getDate() - d.daysBack);

    const deal = await prisma.deal.upsert({
      where: { crmId: `sf-rep1-${i}` },
      update: { title: d.title, value: d.value, closeDate },
      create: {
        crmId: `sf-rep1-${i}`,
        title: d.title,
        value: d.value,
        currency: "USD",
        closeDate,
        stage: "Closed Won",
        repId: rep1.id,
      },
    });

    const cumRevenue = deals1.slice(0, i + 1).reduce((s, x) => s + x.value, 0);
    const attainmentPct = (cumRevenue / 100000) * 100;
    const tier = findRate(attainmentPct);

    await prisma.commissionRecord.upsert({
      where: {
        dealId_userId_periodId: {
          dealId: deal.id,
          userId: rep1.id,
          periodId: period.id,
        },
      },
      update: {},
      create: {
        dealId: deal.id,
        userId: rep1.id,
        periodId: period.id,
        planId: plan.id,
        amount: d.value * tier.rate,
        currency: "USD",
        rate: tier.rate,
        attainmentPct,
      },
    });
  }

  // Rep2 deals (~60% attainment)
  const deals2 = [
    { title: "Umbrella Corp — Pro Plan", value: 35000, daysBack: 12 },
    { title: "Massive Dynamic — Pilot", value: 25000, daysBack: 3 },
  ];

  for (let i = 0; i < deals2.length; i++) {
    const d = deals2[i];
    const closeDate = new Date(now);
    closeDate.setDate(closeDate.getDate() - d.daysBack);

    const deal = await prisma.deal.upsert({
      where: { crmId: `sf-rep2-${i}` },
      update: { title: d.title, value: d.value, closeDate },
      create: {
        crmId: `sf-rep2-${i}`,
        title: d.title,
        value: d.value,
        currency: "USD",
        closeDate,
        stage: "Closed Won",
        repId: rep2.id,
      },
    });

    const cumRevenue = deals2.slice(0, i + 1).reduce((s, x) => s + x.value, 0);
    const attainmentPct = (cumRevenue / 100000) * 100;
    const tier = findRate(attainmentPct);

    await prisma.commissionRecord.upsert({
      where: {
        dealId_userId_periodId: {
          dealId: deal.id,
          userId: rep2.id,
          periodId: period.id,
        },
      },
      update: {},
      create: {
        dealId: deal.id,
        userId: rep2.id,
        periodId: period.id,
        planId: plan.id,
        amount: d.value * tier.rate,
        currency: "USD",
        rate: tier.rate,
        attainmentPct,
      },
    });
  }

  console.log("Done! Test accounts:");
  console.log("  admin@company.com     / admin1234   (ADMIN)");
  console.log("  manager@company.com   / password123 (MANAGER)");
  console.log("  rep1@company.com      / password123 (REP - Sam Sales ~130%)");
  console.log("  rep2@company.com      / password123 (REP - Jordan Revenue ~60%)");
  console.log("  finance@company.com   / password123 (FINANCE)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
