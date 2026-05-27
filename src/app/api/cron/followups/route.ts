/**
 * GET/POST /api/cron/followups?secret=<CRON_SECRET>
 *
 * Processes all due follow-ups across all workspaces.
 * Runs daily (Hobby plan limit) — recommended every hour on Pro.
 *
 * For each due follow-up:
 *   1. Check if lead replied → cancel follow-up
 *   2. Otherwise: generate AI follow-up email, send via workspace credentials
 *   3. Mark as sent OR failed
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOutreach } from "@/lib/integrations/aiPersonalizer";
import { sendEmail } from "@/lib/integrations/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FOLLOWUP_PROMPTS = [
  "Това е follow-up #1. Бъди топъл, припомни предходното писмо в 1 изречение, добави нов angle (case study или въпрос). КРАТЪК — 50-70 думи.",
  "Това е follow-up #2. По-директно. Питай ясно дали имат интерес или предпочитат да премахнем от outreach. 40-60 думи.",
  "Последен follow-up. Кратък break-up email. 30-50 думи. Дай им opt-out опция.",
];

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  // Vercel cron sends Authorization: Bearer ${CRON_SECRET} automatically
  if (!process.env.CRON_SECRET || (secret !== process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.followUp.findMany({
    where: { status: "scheduled", scheduledFor: { lte: now } },
    take: 50, // process max 50 per run to stay under cron timeout
  });

  const stats = { processed: 0, sent: 0, cancelled: 0, failed: 0, skipped: 0 };

  for (const fu of due) {
    stats.processed++;

    try {
      const lead = await prisma.lead.findUnique({ where: { id: fu.leadId } });
      const workspace = await prisma.workspace.findUnique({ where: { id: fu.workspaceId } });
      if (!lead || !workspace || !lead.email) {
        await prisma.followUp.update({ where: { id: fu.id }, data: { status: "cancelled", errorMsg: "Lead or workspace not found" } });
        stats.cancelled++;
        continue;
      }

      // Check if lead replied already
      if (["replied", "interested", "meeting", "closed", "lost"].includes(lead.status)) {
        await prisma.followUp.update({ where: { id: fu.id }, data: { status: "cancelled", errorMsg: `Lead status: ${lead.status}` } });
        stats.cancelled++;
        await prisma.aiActivity.create({
          data: { workspaceId: workspace.id, kind: "followup", tag: "Cron", text: `FU #${fu.stepNumber} към ${lead.company} отменен (lead вече отговори)` },
        });
        continue;
      }

      // Generate follow-up email
      const pains = lead.painPoints ? JSON.parse(lead.painPoints) : [];
      const owner = await prisma.user.findFirst({
        where: { memberships: { some: { workspaceId: workspace.id, role: "owner" } } },
      });

      const email = await generateOutreach({
        companyName: lead.company,
        website: lead.website ?? undefined,
        niche: lead.niche,
        painPoints: pains,
        senderName: owner?.name ?? "Екип",
        language: "bg",
      });

      // Add follow-up context to subject + body
      const fuSubject = `Re: ${email.subject}`;
      const fuBody = `${FOLLOWUP_PROMPTS[fu.stepNumber - 1] ?? FOLLOWUP_PROMPTS[0]}\n\n--- AI generated:\n\n${email.body}`;

      // Send
      const fromEmail = workspace.resendFromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = workspace.resendFromName || workspace.name || "LeadForge";
      const apiKey = workspace.resendApiKey || process.env.RESEND_API_KEY;
      const isSandbox = fromEmail.endsWith("@resend.dev");

      const result = await sendEmail({
        from: fromEmail,
        fromName,
        to: isSandbox && owner?.email ? owner.email : lead.email,
        subject: isSandbox ? `[FU#${fu.stepNumber} → ${lead.email}] ${fuSubject}` : fuSubject,
        body: fuBody,
        replyTo: owner?.email,
        provider: "resend",
        apiKey,
      });

      if (result.success) {
        await prisma.followUp.update({ where: { id: fu.id }, data: { status: "sent", sentAt: new Date() } });
        await prisma.message.create({
          data: {
            campaignId: fu.campaignId!,
            leadId: lead.id,
            stepIndex: fu.stepNumber,
            subject: fuSubject,
            body: fuBody,
            status: "sent",
            sentAt: new Date(),
          },
        });
        stats.sent++;
        await prisma.aiActivity.create({
          data: { workspaceId: workspace.id, kind: "followup", tag: "Cron", text: `Follow-up #${fu.stepNumber} изпратен до ${lead.company}` },
        });
      } else {
        await prisma.followUp.update({ where: { id: fu.id }, data: { status: "failed", errorMsg: result.error } });
        stats.failed++;
      }
    } catch (err) {
      await prisma.followUp.update({ where: { id: fu.id }, data: { status: "failed", errorMsg: (err as Error).message } });
      stats.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...stats, time: now.toISOString() });
}
