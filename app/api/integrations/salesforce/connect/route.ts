import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSalesforceAuthUrl } from "@/lib/salesforce";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = getSalesforceAuthUrl();
  return NextResponse.redirect(url);
}
