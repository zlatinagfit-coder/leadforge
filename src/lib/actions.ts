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

/**
 * Sends a real, AI-personalized outreach email to a single lead.
 *
 * In sandbox mode (no verified Resend domain):
 *   - Resend will only accept the message if `to` is the account-owner email.
 *   - We auto-redirect outreach to RESEND_OWNER_EMAIL so user can preview the email
 *     in their own inbox without owning the prospect domain.
 */
export async function sendOutreachToLeadAction(leadId: string) {
  const workspace = await getCurrentWorkspace();
  const user = await getCurrentUser();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead) return { success: false, error: "Lead not found" };
  if (!lead.email) return { success: false, error: "Lead has no email — run 'Намери нови' first" };

  const pains: string[] = lead.painPoints ? JSON.parse(lead.painPoints) : [];

  // Generate AI outreach
  let email;
  try {
    email = await generateOutreach({
      companyName: lead.company,
      website: lead.website ?? undefined,
      niche: lead.niche,
      painPoints: pains.length > 0 ? pains : ["Слаб онлайн funnel", "Няма retargeting"],
      senderName: user.name ?? "Екипът",
      language: "bg",
    });
  } catch (err) {
    return { success: false, error: `AI generate: ${(err as Error).message}` };
  }

  // Always use env-configured sender (so no stale DB rows can break it)
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "LeadForge";
  const ownerEmail = user.email;
  const inbox = await prisma.sendingInbox.findFirst({ where: { workspaceId: workspace.id } });

  // Sandbox = sending domain is resend.dev (no verified domain yet)
  let isSandbox = fromEmail.endsWith("@resend.dev");
  const actualRecipient = isSandbox ? ownerEmail : lead.email;
  const subjectPrefix = isSandbox ? `[ТЕСТ → ${lead.email}] ` : "";

  let sendResult = await sendEmail({
    from: fromEmail,
    fromName,
    to: actualRecipient,
    subject: subjectPrefix + email.subject,
    body: email.body + (isSandbox ? `\n\n---\n[Sandbox mode] Този имейл щеше да бъде изпратен до: ${lead.email}\nЗа да изпращаш реални имейли, verify-ни домейн в Resend и обнови RESEND_FROM_EMAIL.` : ""),
    replyTo: ownerEmail,
    provider: "resend",
  });

  // Auto-fallback: if Resend rejects domain → retry as sandbox preview
  if (!sendResult.success && sendResult.error?.toLowerCase().includes("domain")) {
    isSandbox = true;
    sendResult = await sendEmail({
      from: "onboarding@resend.dev",
      fromName,
      to: ownerEmail,
      subject: `[ТЕСТ → ${lead.email}] ${email.subject}`,
      body: email.body + `\n\n---\n[Auto-sandbox fallback] Първият опит към ${lead.email} не успя защото домейнът ${fromEmail.split("@")[1]} не е verified в Resend. Преглеждаш версията тук.`,
      replyTo: ownerEmail,
      provider: "resend",
    });
  }

  // Persist a Message record so it shows up in inbox/leads history
  // Find or create a "Manual sends" campaign
  let campaign = await prisma.campaign.findFirst({
    where: { workspaceId: workspace.id, name: "Manual outreach" },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: { workspaceId: workspace.id, name: "Manual outreach", niche: null, status: "active" },
    });
  }

  await prisma.message.create({
    data: {
      campaignId: campaign.id,
      leadId: lead.id,
      subject: email.subject,
      body: email.body,
      status: sendResult.success ? "sent" : "failed",
      sentAt: sendResult.success ? new Date() : null,
      errorMsg: sendResult.error,
    },
  });

  if (sendResult.success) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: lead.status === "new" ? "contacted" : lead.status, lastTouchAt: new Date() },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { sent: { increment: 1 } },
    });
    if (inbox) {
      await prisma.sendingInbox.update({
        where: { id: inbox.id },
        data: { sentToday: { increment: 1 } },
      });
    }
    await prisma.aiActivity.create({
      data: {
        workspaceId: workspace.id,
        kind: "send",
        tag: "Sender",
        text: isSandbox
          ? `Sandbox: тест-имейл за ${lead.company} → твоя Gmail`
          : `Outreach изпратен до ${lead.company} (${lead.email})`,
      },
    });
  } else {
    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "error", tag: "Sender", text: `Грешка при изпращане до ${lead.company}: ${sendResult.error}` },
    });
  }

  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/inbox");
  revalidatePath("/agent");

  return {
    success: sendResult.success,
    error: sendResult.error,
    isSandbox,
    previewSentTo: isSandbox ? ownerEmail : lead.email,
    intendedRecipient: lead.email,
    subject: email.subject,
  };
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

  // Always use env-configured sender — auto sandbox-fallback if domain not verified
  const user = await getCurrentUser();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "LeadForge";
  const inbox = await prisma.sendingInbox.findFirst({ where: { workspaceId: workspace.id } });

  const isSandbox = fromEmail.endsWith("@resend.dev");
  const actualTo = isSandbox ? user.email : thread.fromEmail;
  const subjectPrefix = isSandbox ? `[ТЕСТ → ${thread.fromEmail}] ` : "";

  let result = await sendEmail({
    from: fromEmail,
    fromName,
    to: actualTo,
    subject: subjectPrefix + (thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`),
    body: body + (isSandbox ? `\n\n---\n[Sandbox] Истинският адресат щеше да е ${thread.fromEmail}.` : ""),
    replyTo: user.email,
    provider: "resend",
  });

  // Auto-fallback if Resend rejects domain
  if (!result.success && result.error?.toLowerCase().includes("domain")) {
    result = await sendEmail({
      from: "onboarding@resend.dev",
      fromName,
      to: user.email,
      subject: `[ТЕСТ → ${thread.fromEmail}] Re: ${thread.subject}`,
      body: body + `\n\n---\n[Auto-sandbox] Първият опит към ${thread.fromEmail} не успя. Виж версия тук.`,
      replyTo: user.email,
      provider: "resend",
    });
  }

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
// WORKSPACE / SETTINGS — update workspace + sending inboxes
// ============================================================

export async function updateWorkspaceAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const name = formData.get("name")?.toString().trim();
  const slug = formData.get("slug")?.toString().trim();
  const accentColor = formData.get("accentColor")?.toString().trim();

  if (!name) return { success: false, error: "Името е задължително" };

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      name,
      ...(slug && { slug }),
      ...(accentColor && { accentColor }),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function addSendingInboxAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const label = formData.get("label")?.toString().trim() ?? "";
  const fromEmail = formData.get("fromEmail")?.toString().trim() ?? "";
  const fromName = formData.get("fromName")?.toString().trim() ?? "";
  const provider = formData.get("provider")?.toString().trim() ?? "resend";

  if (!label || !fromEmail || !fromName) return { success: false, error: "Всички полета са задължителни" };

  await prisma.sendingInbox.create({
    data: { workspaceId: workspace.id, label, fromEmail, fromName, provider, dailyLimit: 50, warmedUp: false, health: 100 },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteSendingInboxAction(inboxId: string) {
  const workspace = await getCurrentWorkspace();
  await prisma.sendingInbox.deleteMany({ where: { id: inboxId, workspaceId: workspace.id } });
  revalidatePath("/settings");
  return { success: true };
}

export async function inviteMemberAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const email = formData.get("email")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const role = formData.get("role")?.toString().trim() ?? "member";

  if (!email) return { success: false, error: "Email е задължителен" };

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: name || email.split("@")[0] } });
  }

  // Check if already a member
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
  });
  if (existingMembership) return { success: false, error: "Този потребител вече е член" };

  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function removeMemberAction(membershipId: string) {
  const workspace = await getCurrentWorkspace();
  // Don't allow removing the only owner
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, workspaceId: workspace.id } });
  if (!membership) return { success: false, error: "Not found" };

  if (membership.role === "owner") {
    const ownerCount = await prisma.membership.count({ where: { workspaceId: workspace.id, role: "owner" } });
    if (ownerCount === 1) return { success: false, error: "Не можеш да премахнеш единствения owner" };
  }

  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/settings");
  return { success: true };
}

// ============================================================
// AGENT — natural-language prompt → scraping action
// ============================================================

/**
 * Parses a free-text prompt (e.g. "намери 50 зъболекари в София") into
 * structured Apify scrape parameters, then executes the scrape.
 */
export async function runAgentPromptAction(promptText: string) {
  const workspace = await getCurrentWorkspace();
  const prompt = promptText.trim();
  if (!prompt) return { success: false, error: "Empty prompt" };

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "Agent", text: `Промпт от потребителя: "${prompt.slice(0, 120)}"` },
  });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { success: false, error: "OPENAI_API_KEY missing — cannot parse prompts" };
  }

  // Use OpenAI to extract structured params
  let parsed: { query: string; niche: string; limit: number } | null = null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a lead-gen agent. Parse Bulgarian or English prompts about finding business leads. Return JSON:
{
  "query": string  // English Google Maps query, e.g. "dental clinics in Sofia, Bulgaria"
  "niche": string  // One of: "Зъболекари","Фитнес","Ecommerce","Недвижими имоти","Ресторанти","Адвокати","Salon & Beauty","Auto Repair","Healthcare"
  "limit": number  // 1-25 (cap at 25 for free tier)
}
If prompt is unclear, infer the most likely query. If no location given, default to "Sofia, Bulgaria".`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    parsed = JSON.parse(data.choices[0].message.content);
  } catch (err) {
    return { success: false, error: `AI parse error: ${(err as Error).message}` };
  }

  if (!parsed?.query) return { success: false, error: "Failed to parse prompt" };

  // Cap limit for free tier
  const limit = Math.min(parsed.limit ?? 10, 25);

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "Agent", text: `AI парсна: query="${parsed.query}" · niche=${parsed.niche} · limit=${limit}` },
  });

  // Execute scrape via existing action
  const fd = new FormData();
  fd.set("query", parsed.query);
  fd.set("niche", parsed.niche);
  fd.set("limit", String(limit));
  const res = await scrapeNewLeadsAction(fd);

  return { ...res, parsed };
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
