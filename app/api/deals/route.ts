import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  const where =
    session.user.role === "REP"
      ? { repId: session.user.id }
      : {};

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true, email: true } },
        commissions: { select: { id: true, amount: true, currency: true, periodId: true } },
      },
      orderBy: { closeDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({ deals, total, page, pages: Math.ceil(total / limit) });
}
