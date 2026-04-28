import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "REP", "FINANCE"]),
  managerId: z.string().optional(),
  password: z.string().min(8),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...userData } = parsed.data;
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { ...userData, password: hashed },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
