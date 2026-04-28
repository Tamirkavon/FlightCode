import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { SyncButton } from "./SyncButton";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const integration = await prisma.cRMIntegration.findFirst({
    where: { type: "SALESFORCE" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h1>

      {sp.connected === "1" && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
          Salesforce connected successfully!
        </div>
      )}
      {sp.error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          Error: {sp.error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">
              SF
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Salesforce</h2>
              <p className="text-sm text-gray-500">Sync Closed Won opportunities as deals</p>
            </div>
          </div>
          {integration?.isActive ? (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">
              Connected
            </span>
          ) : (
            <a
              href="/api/integrations/salesforce/connect"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Connect
            </a>
          )}
        </div>

        {integration && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Instance URL</span>
              <span className="font-mono text-xs">{integration.instanceUrl}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Last synced</span>
              <span>
                {integration.lastSyncedAt
                  ? format(integration.lastSyncedAt, "MMM d, yyyy h:mm a")
                  : "Never"}
              </span>
            </div>
            <div className="pt-2">
              <SyncButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
