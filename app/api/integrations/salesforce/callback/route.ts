import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/salesforce";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/integrations?error=no_code", req.url));
  }

  const tokens = await exchangeCodeForTokens(code);

  await prisma.cRMIntegration.upsert({
    where: { id: "default" },
    update: {
      instanceUrl: tokens.instanceUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      isActive: true,
    },
    create: {
      id: "default",
      type: "SALESFORCE",
      instanceUrl: tokens.instanceUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL("/integrations?connected=1", req.url));
}
