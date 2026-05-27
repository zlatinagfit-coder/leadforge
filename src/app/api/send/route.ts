import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/integrations/sender";
import { getCurrentWorkspace } from "@/lib/workspace";

/**
 * POST /api/send
 * Body: { campaignId: string, leadId: string, subject: string, body: string }
 *
 * Изпраща един email + създава Message запис в DB.
 */
export async function POST(req: NextRequest) {
  const { campaignId, leadId, subject, body } = await req.json();
  if (!leadId || !subject || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const workspace = await getCurrentWorkspace();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead || !lead.email) return NextResponse.json({ error: "Lead or email not found" }, { status: 404 });

  const inbox = await prisma.sendingInbox.findFirst({
    where: { workspaceId: workspace.id, sentToday: { lt: prisma.sendingInbox.fields.dailyLimit } },
    orderBy: { sentToday: "asc" },
  });
  if (!inbox) return NextResponse.json({ error: "Всички inboxes са достигнали дневния лимит" }, { status: 429 });

  const result = await sendEmail({
    from: inbox.fromEmail,
    fromName: inbox.fromName,
    to: lead.email,
    subject,
    body,
    provider: inbox.provider as "resend" | "gmail" | "sendgrid",
  });

  if (campaignId) {
    await prisma.message.create({
      data: {
        campaignId,
        leadId: lead.id,
        subject,
        body,
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : null,
        errorMsg: result.error,
      },
    });
  }

  if (result.success) {
    await prisma.sendingInbox.update({
      where: { id: inbox.id },
      data: { sentToday: { increment: 1 } },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: lead.status === "new" ? "contacted" : lead.status, lastTouchAt: new Date() },
    });
    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "send", tag: "Sender", text: `Изпратен email до ${lead.company} (inbox: ${inbox.label})` },
    });
  }

  return NextResponse.json(result);
}
