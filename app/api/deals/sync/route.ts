import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncDeals } from "@/lib/salesforce";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await syncDeals();
  return NextResponse.json(result);
}
