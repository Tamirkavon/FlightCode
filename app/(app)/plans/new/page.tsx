import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlanForm } from "@/components/plans/PlanForm";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/plans");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Commission Plan</h1>
      <PlanForm />
    </div>
  );
}
