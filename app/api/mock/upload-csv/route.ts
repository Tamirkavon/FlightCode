import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { calculateDealCommission } from "@/lib/commission-engine";

interface CSVRow {
  name: string;
  value: string;
  close_date: string;
  rep_email: string;
  stage?: string;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row as unknown as CSVRow;
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { csv } = await req.json();
  if (!csv) return NextResponse.json({ error: "No CSV provided" }, { status: 400 });

  const rows = parseCSV(csv as string);
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.name || !row.value || !row.close_date || !row.rep_email) {
      skipped++;
      continue;
    }

    const value = parseFloat(row.value);
    if (isNaN(value) || value <= 0) { skipped++; continue; }

    const closeDate = new Date(row.close_date);
    if (isNaN(closeDate.getTime())) { skipped++; continue; }

    const rep = await prisma.user.findUnique({ where: { email: row.rep_email } });
    if (!rep) { skipped++; continue; }

    const crmId = `csv-${row.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}-${rep.id.slice(0, 6)}`;

    const deal = await prisma.deal.upsert({
      where: { crmId },
      update: { title: row.name, value, closeDate, stage: row.stage ?? "Closed Won" },
      create: {
        crmId,
        title: row.name,
        value,
        currency: "USD",
        closeDate,
        stage: row.stage ?? "Closed Won",
        repId: rep.id,
      },
    });

    // Find or create matching period
    const periodStart = startOfMonth(closeDate);
    const periodEnd = endOfMonth(closeDate);
    const periodId = `period-${periodStart.getFullYear()}-${periodStart.getMonth() + 1}`;

    await prisma.commissionPeriod.upsert({
      where: { id: periodId },
      update: {},
      create: {
        id: periodId,
        name: closeDate.toLocaleString("default", { month: "long", year: "numeric" }),
        type: "MONTHLY",
        startDate: periodStart,
        endDate: periodEnd,
        status: "OPEN",
      },
    });

    await calculateDealCommission(deal.id, periodId);

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
