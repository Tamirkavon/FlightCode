import { prisma } from "@/lib/prisma";
import { calculateDealCommission } from "@/lib/commission-engine";

interface SFOpportunity {
  Id: string;
  Name: string;
  Amount: number;
  CloseDate: string;
  StageName: string;
  Owner: { Email: string };
  CurrencyIsoCode?: string;
}

export function getSalesforceAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_CALLBACK_URL!,
    scope: "api refresh_token",
  });
  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
      redirect_uri: process.env.SALESFORCE_CALLBACK_URL!,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Salesforce token exchange failed: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    instanceUrl: data.instance_url as string,
    expiresAt: new Date(Date.now() + 3600 * 1000), // ~1h
  };
}

async function refreshAccessToken(integration: {
  id: string;
  instanceUrl: string;
  refreshToken: string;
}) {
  const res = await fetch(
    `${integration.instanceUrl}/services/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.SALESFORCE_CLIENT_ID!,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        refresh_token: integration.refreshToken,
      }),
    }
  );

  if (!res.ok) throw new Error("Token refresh failed");

  const data = await res.json();
  const newToken = data.access_token as string;
  const expiresAt = new Date(Date.now() + 3600 * 1000);

  await prisma.cRMIntegration.update({
    where: { id: integration.id },
    data: { accessToken: newToken, tokenExpiresAt: expiresAt },
  });

  return newToken;
}

async function getValidToken(integration: {
  id: string;
  instanceUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
}) {
  if (
    integration.tokenExpiresAt &&
    integration.tokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return integration.accessToken;
  }
  return refreshAccessToken(integration);
}

export async function syncDeals() {
  const integration = await prisma.cRMIntegration.findFirst({
    where: { isActive: true, type: "SALESFORCE" },
  });

  if (!integration) return { synced: 0, error: "No active Salesforce integration" };

  const token = await getValidToken(integration);
  const lastSync = integration.lastSyncedAt?.toISOString() ?? "1970-01-01T00:00:00Z";

  const soql = encodeURIComponent(
    `SELECT Id, Name, Amount, CloseDate, StageName, Owner.Email, CurrencyIsoCode ` +
    `FROM Opportunity ` +
    `WHERE StageName = 'Closed Won' AND SystemModstamp >= ${lastSync} ` +
    `ORDER BY CloseDate DESC LIMIT 200`
  );

  const res = await fetch(
    `${integration.instanceUrl}/services/data/v59.0/query?q=${soql}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`SOQL query failed: ${await res.text()}`);

  const data = await res.json();
  const opportunities: SFOpportunity[] = data.records ?? [];

  let synced = 0;

  for (const opp of opportunities) {
    const rep = await prisma.user.findUnique({
      where: { email: opp.Owner.Email },
    });

    if (!rep) continue;

    const deal = await prisma.deal.upsert({
      where: { crmId: opp.Id },
      update: {
        title: opp.Name,
        value: opp.Amount ?? 0,
        closeDate: new Date(opp.CloseDate),
        stage: opp.StageName,
        repId: rep.id,
        rawData: opp as object,
      },
      create: {
        crmId: opp.Id,
        title: opp.Name,
        value: opp.Amount ?? 0,
        currency: opp.CurrencyIsoCode ?? "USD",
        closeDate: new Date(opp.CloseDate),
        stage: opp.StageName,
        repId: rep.id,
        rawData: opp as object,
      },
    });

    // Trigger commission recalculation for all periods overlapping this deal
    const periods = await prisma.commissionPeriod.findMany({
      where: {
        startDate: { lte: deal.closeDate },
        endDate: { gte: deal.closeDate },
        status: { in: ["OPEN", "PENDING_APPROVAL"] },
      },
    });

    for (const period of periods) {
      await calculateDealCommission(deal.id, period.id);
    }

    synced++;
  }

  await prisma.cRMIntegration.update({
    where: { id: integration.id },
    data: { lastSyncedAt: new Date() },
  });

  return { synced };
}
