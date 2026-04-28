import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bob-cream)" }}>
      <Sidebar role={session.user.role} name={session.user.name} />
      <main className="flex-1 p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
