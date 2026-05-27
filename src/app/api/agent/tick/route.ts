import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";

/**
 * GET/POST /api/agent/tick
 *
 * Една стъпка от AI agent loop. Викай го на всеки 5 минути с Vercel Cron / Trigger.dev.
 *
 * Логика:
 *   1. Намери активни кампании
 *   2. За всеки lead в "new" status — изпрати първи имейл (ако има inbox capacity)
 *   3. За всеки lead контактиран преди 3+ дни без отговор — изпрати follow-up #1
 *   4. За всеки lead контактиран преди 7+ дни без отговор — изпрати follow-up #2
 *   5. Логва всичко в AiActivity
 *
 * TODO: production setup
 *   - vercel.json: { "crons": [{ "path": "/api/agent/tick", "schedule": "*​/5 * * * *" }] }
 *   - Add CRON_SECRET to auth this endpoint
 */
export async function POST() {
  const workspace = await getCurrentWorkspace();

  const activeCampaigns = await prisma.campaign.findMany({
    where: { workspaceId: workspace.id, status: "active" },
  });

  const stats = { sent: 0, followups: 0, skipped: 0 };

  // TODO: implement real tick logic
  // For now just log a heartbeat
  await prisma.aiActivity.create({
    data: {
      workspaceId: workspace.id,
      kind: "scrape",
      tag: "Agent",
      text: `Agent tick · ${activeCampaigns.length} активни кампании · ${stats.sent} изпратени, ${stats.followups} follow-ups`,
    },
  });

  return NextResponse.json({ ok: true, activeCampaigns: activeCampaigns.length, ...stats });
}

export async function GET() {
  return POST();
}
