import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MockDataUploader } from "./MockDataUploader";
import { MockDataGenerator } from "./MockDataGenerator";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const dealCount = await prisma.deal.count();
  const repCount = await prisma.user.count({ where: { role: "REP" } });

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: "var(--bob-charcoal)", fontFamily: "var(--font-serif)" }}
      >
        Data
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--bob-gray)" }}>
        Upload your deal data or generate realistic mock data for demo purposes.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Deals loaded" value={dealCount} />
        <StatCard label="Sales reps" value={repCount} />
      </div>

      {/* Mock generator */}
      <Section title="Generate mock data" description="Instantly create realistic deals, reps, and commission records for demo or testing.">
        <MockDataGenerator />
      </Section>

      {/* CSV upload */}
      <Section title="Upload deals (CSV)" description="Upload a CSV file with your deal data. Required columns: name, value, close_date, rep_email, stage.">
        <MockDataUploader />
      </Section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#fff", border: "1px solid var(--bob-border)" }}
    >
      <p className="text-sm" style={{ color: "var(--bob-gray)" }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: "var(--bob-charcoal)" }}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-6 mb-4"
      style={{ background: "#fff", border: "1px solid var(--bob-border)" }}
    >
      <h2 className="font-semibold mb-0.5" style={{ color: "var(--bob-charcoal)" }}>
        {title}
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--bob-gray)" }}>
        {description}
      </p>
      {children}
    </div>
  );
}
