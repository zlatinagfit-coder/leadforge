"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace, getCurrentUser } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { scrapeGoogleMaps } from "@/lib/integrations/scraper";
import { findEmailsForDomain } from "@/lib/integrations/emailFinder";
import { analyzeWebsite, generateOutreach, classifyReply } from "@/lib/integrations/aiPersonalizer";
import { sendEmail } from "@/lib/integrations/sender";

// ============================================================
// LEADS — find new, update status
// ============================================================

export async function scrapeNewLeadsAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const query = formData.get("query")?.toString().trim() ?? "";
  const niche = formData.get("niche")?.toString().trim() ?? "Other";
  const limit = Math.min(parseInt(formData.get("limit")?.toString() ?? "10"), 25);

  if (!query) return { success: false, error: "Missing query" };

  // 1) Log start
  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "scrape", tag: "Scraper", text: `Започвам scrape: "${query}" (до ${limit} бизнеса)` },
  });

  let scraped: Awaited<ReturnType<typeof scrapeGoogleMaps>> = [];
  try {
    scraped = await scrapeGoogleMaps(query, limit);
  } catch (err) {
    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "error", tag: "Scraper", text: `Apify грешка: ${(err as Error).message.slice(0, 200)}` },
    });
    return { success: false, error: `Apify error: ${(err as Error).message}` };
  }

  if (scraped.length === 0) {
    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "scrape", tag: "Scraper", text: `Apify върна 0 бизнеса за "${query}"` },
    });
    return { success: false, error: "Apify върна 0 резултата. Опитай по-конкретно запитване." };
  }

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "scrape", tag: "Scraper", text: `Скрейпнах ${scraped.length} бизнеса от Google Maps` },
  });

  // 2) For each business: enrich email + AI analyze
  const created = [];
  for (const biz of scraped.slice(0, limit)) {
    if (!biz.website) continue;
    const domain = biz.website;

    // De-dup: skip if domain already in DB
    const existing = await prisma.lead.findFirst({
      where: { workspaceId: workspace.id, website: domain },
    });
    if (existing) continue;

    const emails = await findEmailsForDomain(domain);
    const bestEmail = emails.sort((a, b) => b.confidence - a.confidence)[0];

    const analysis = await analyzeWebsite(`https://${domain}`);

    const lead = await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        company: biz.name,
        niche,
        city: biz.city,
        country: biz.country,
        website: domain,
        email: bestEmail?.email,
        phone: biz.phone,
        score: analysis.score,
        painPoints: JSON.stringify(analysis.painPoints),
        industry: analysis.industry,
        source: "ai_scrape",
      },
    });
    created.push(lead);

    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "analyze", tag: "Analyzer", text: `${biz.name} · score ${analysis.score} · ${analysis.painPoints.length} pain points` },
    });
  }

  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/agent");
  return { success: true, count: created.length };
}

export async function updateLeadStatusAction(leadId: string, newStatus: string) {
  const workspace = await getCurrentWorkspace();
  await prisma.lead.update({
    where: { id: leadId, workspaceId: workspace.id },
    data: { status: newStatus, lastTouchAt: new Date() },
  });
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { success: true };
}

// ============================================================
// CAMPAIGNS — create
// ============================================================

export async function createCampaignAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const name = formData.get("name")?.toString().trim() ?? "";
  const niche = formData.get("niche")?.toString().trim() ?? null;
  const targetCountry = formData.get("targetCountry")?.toString().trim() ?? null;
  const targetCity = formData.get("targetCity")?.toString().trim() ?? null;

  if (!name) return { success: false, error: "Missing name" };

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name,
      niche,
      targetCountry,
      targetCity,
      status: "draft",
    },
  });

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "Agent", text: `Създадена нова кампания: ${name}` },
  });

  revalidatePath("/campaigns");
  return { success: true, campaignId: campaign.id };
}

export async function toggleCampaignStatusAction(campaignId: string) {
  const workspace = await getCurrentWorkspace();
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId: workspace.id },
  });
  if (!campaign) return { success: false, error: "Not found" };

  const newStatus = campaign.status === "active" ? "paused" : "active";

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: newStatus },
  });

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "Agent", text: `Кампания "${campaign.name}" ${newStatus === "active" ? "стартирана" : "спряна"}` },
  });

  revalidatePath("/campaigns");
  return { success: true, newStatus };
}

// ============================================================
// INBOX — AI suggest + send
// ============================================================

export async function generateAiReplyAction(threadId: string): Promise<{ success: boolean; reply?: string; error?: string }> {
  const workspace = await getCurrentWorkspace();
  const thread = await prisma.inboxThread.findFirst({
    where: { id: threadId, workspaceId: workspace.id },
    include: { messages: { orderBy: { at: "desc" }, take: 5 }, lead: true },
  });
  if (!thread) return { success: false, error: "Thread not found" };

  const lastInbound = thread.messages.find((m) => m.direction === "inbound");
  if (!lastInbound) return { success: false, error: "No inbound message to reply to" };

  const user = await getCurrentUser();

  try {
    // Use generateOutreach with a "reply mode" context
    const { body } = await generateOutreach({
      companyName: thread.fromCompany ?? thread.fromName ?? thread.fromEmail,
      niche: thread.lead?.niche ?? "B2B",
      painPoints: thread.lead?.painPoints ? JSON.parse(thread.lead.painPoints) : [],
      senderName: user.name ?? "Екип",
      language: "bg",
    });

    return { success: true, reply: body };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function sendReplyAction(threadId: string, formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const body = formData.get("body")?.toString().trim() ?? "";
  if (!body) return { success: false, error: "Empty reply" };

  const thread = await prisma.inboxThread.findFirst({
    where: { id: threadId, workspaceId: workspace.id },
  });
  if (!thread) return { success: false, error: "Thread not found" };

  const inbox = await prisma.sendingInbox.findFirst({
    where: { workspaceId: workspace.id, warmedUp: true },
    orderBy: { sentToday: "asc" },
  });

  const fromEmail = inbox?.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = inbox?.fromName ?? process.env.RESEND_FROM_NAME ?? "LeadForge";

  const result = await sendEmail({
    from: fromEmail,
    fromName,
    to: thread.fromEmail,
    subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
    body,
    provider: "resend",
  });

  // Log the message
  await prisma.inboxMessage.create({
    data: {
      threadId: thread.id,
      direction: "outbound",
      fromEmail,
      toEmail: thread.fromEmail,
      subject: thread.subject,
      body,
    },
  });

  await prisma.inboxThread.update({
    where: { id: threadId },
    data: { lastAt: new Date(), lastPreview: body.slice(0, 200), unread: false },
  });

  if (inbox && result.success) {
    await prisma.sendingInbox.update({
      where: { id: inbox.id },
      data: { sentToday: { increment: 1 } },
    });
  }

  await prisma.aiActivity.create({
    data: {
      workspaceId: workspace.id,
      kind: result.success ? "send" : "error",
      tag: "Sender",
      text: result.success ? `Отговор изпратен до ${thread.fromName ?? thread.fromEmail}` : `Грешка при изпращане: ${result.error}`,
    },
  });

  revalidatePath("/inbox");
  return { success: result.success, error: result.error };
}

export async function markThreadReadAction(threadId: string) {
  const workspace = await getCurrentWorkspace();
  await prisma.inboxThread.update({
    where: { id: threadId, workspaceId: workspace.id },
    data: { unread: false },
  });
  revalidatePath("/inbox");
  return { success: true };
}

// ============================================================
// AGENT — pause/resume + manual tick
// ============================================================

export async function triggerAgentTickAction() {
  // Manually trigger one round of agent work
  const workspace = await getCurrentWorkspace();
  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "scrape", tag: "Agent", text: "Ръчно тригериран agent tick" },
  });
  revalidatePath("/agent");
  return { success: true };
}
