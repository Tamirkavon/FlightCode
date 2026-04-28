import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateCommissionsForPeriod } from "@/lib/commission-engine";
import { z } from "zod";

const schema = z.object({ periodId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await calculateCommissionsForPeriod(parsed.data.periodId);
  return NextResponse.json({ ok: true });
}
