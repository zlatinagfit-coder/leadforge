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
    scraped = await scrapeGoogleMaps(query, limit, { apifyToken: workspace.apifyToken ?? undefined });
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

    const emails = await findEmailsForDomain(domain, { hunterApiKey: workspace.hunterApiKey ?? undefined });
    const bestEmail = emails.sort((a, b) => b.confidence - a.confidence)[0];

    const analysis = await analyzeWebsite(`https://${domain}`, { openaiApiKey: workspace.openaiApiKey ?? undefined });

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
        analysis: JSON.stringify({
          hasWebsite: analysis.hasWebsite,
          websiteReachable: analysis.websiteReachable,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          usagePatterns: analysis.usagePatterns,
          funnelGaps: analysis.funnelGaps,
          techStack: analysis.techStack,
          summary: analysis.summary,
        }),
        industry: analysis.industry,
        source: "ai_scrape",
      },
    });
    created.push(lead);

    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "analyze", tag: "Analyzer", text: `${biz.name} · score ${analysis.score} · ${analysis.strengths.length}↑ ${analysis.weaknesses.length}↓` },
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
      openaiApiKey: workspace.openaiApiKey ?? undefined,
    });
  } catch (err) {
    return { success: false, error: `AI generate: ${(err as Error).message}` };
  }

  // Prefer workspace credentials, fall back to global env
  const fromEmail = workspace.resendFromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = workspace.resendFromName || workspace.name || process.env.RESEND_FROM_NAME || "LeadForge";
  const apiKey = workspace.resendApiKey || process.env.RESEND_API_KEY;
  const ownerEmail = user.email;

  // Sandbox = sending domain is resend.dev (no verified domain yet)
  let isSandbox = fromEmail.endsWith("@resend.dev");
  const actualRecipient = isSandbox ? ownerEmail : lead.email;
  const subjectPrefix = isSandbox ? `[ТЕСТ → ${lead.email}] ` : "";

  let sendResult = await sendEmail({
    from: fromEmail,
    fromName,
    to: actualRecipient,
    subject: subjectPrefix + email.subject,
    body: email.body + (isSandbox ? `\n\n---\n[Sandbox mode] Този имейл щеше да бъде изпратен до: ${lead.email}\nЗа да изпращаш реални имейли, свържи Resend API ключ + verified домейн в Настройки.` : ""),
    replyTo: ownerEmail,
    provider: "resend",
    apiKey,
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
      apiKey,
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

    // Schedule follow-ups (72h between each step)
    if (workspace.followupEnabled) {
      const delayMs = workspace.followupDelayHours * 60 * 60 * 1000;
      const maxSteps = workspace.followupMaxSteps;

      // Cancel any pending follow-ups for this lead first (idempotency)
      await prisma.followUp.updateMany({
        where: { leadId: lead.id, status: "scheduled" },
        data: { status: "cancelled" },
      });

      for (let step = 1; step <= maxSteps; step++) {
        await prisma.followUp.create({
          data: {
            workspaceId: workspace.id,
            leadId: lead.id,
            campaignId: campaign.id,
            stepNumber: step,
            scheduledFor: new Date(Date.now() + delayMs * step),
            status: "scheduled",
          },
        });
      }
    }

    await prisma.aiActivity.create({
      data: {
        workspaceId: workspace.id,
        kind: "send",
        tag: "Sender",
        text: isSandbox
          ? `Sandbox: тест-имейл за ${lead.company} → твоя Gmail · ${workspace.followupEnabled ? `${workspace.followupMaxSteps} follow-ups насрочени` : ""}`
          : `Outreach изпратен до ${lead.company} · ${workspace.followupEnabled ? `следва FU след ${workspace.followupDelayHours}ч` : ""}`,
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

/**
 * Re-runs AI website analysis for an existing lead.
 * Useful when the lead has stale or empty analysis data.
 */
export async function reanalyzeLeadAction(leadId: string) {
  const workspace = await getCurrentWorkspace();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead) return { success: false, error: "Lead not found" };
  if (!lead.website) return { success: false, error: "Lead няма уебсайт за анализ" };

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "analyze", tag: "Analyzer", text: `Преанализирам ${lead.company}...` },
  });

  const analysis = await analyzeWebsite(`https://${lead.website}`, { openaiApiKey: workspace.openaiApiKey ?? undefined });
  const painPoints = analysis.painPoints.length > 0 ? analysis.painPoints : analysis.weaknesses.slice(0, 5);

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      score: analysis.score,
      painPoints: JSON.stringify(painPoints),
      analysis: JSON.stringify({
        hasWebsite: analysis.hasWebsite,
        websiteReachable: analysis.websiteReachable,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        usagePatterns: analysis.usagePatterns,
        funnelGaps: analysis.funnelGaps,
        techStack: analysis.techStack,
        summary: analysis.summary,
      }),
      industry: analysis.industry ?? lead.industry,
    },
  });

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "analyze", tag: "Analyzer", text: `${lead.company} преанализиран · score ${analysis.score} · ${analysis.strengths.length}↑ ${analysis.weaknesses.length}↓` },
  });

  revalidatePath("/leads");
  return { success: true, score: analysis.score };
}

export async function updateLeadNotesAction(leadId: string, notes: string) {
  const workspace = await getCurrentWorkspace();
  await prisma.lead.update({
    where: { id: leadId, workspaceId: workspace.id },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/leads");
  return { success: true };
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
      openaiApiKey: workspace.openaiApiKey ?? undefined,
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

/**
 * Updates ALL API keys for the workspace + tests each one.
 * Returns per-key status so UI can show ✓ или ✗ срещу всеки.
 */
export async function updateApiKeysAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();

  const openaiApiKey = formData.get("openaiApiKey")?.toString().trim() || null;
  const apifyToken = formData.get("apifyToken")?.toString().trim() || null;
  const hunterApiKey = formData.get("hunterApiKey")?.toString().trim() || null;
  const resendApiKey = formData.get("resendApiKey")?.toString().trim() || null;
  const resendFromEmail = formData.get("resendFromEmail")?.toString().trim().toLowerCase() || null;
  const resendFromName = formData.get("resendFromName")?.toString().trim() || null;

  const results: Record<string, { ok: boolean; error?: string }> = {};

  // 1. OpenAI
  if (openaiApiKey) {
    if (!openaiApiKey.startsWith("sk-")) {
      results.openai = { ok: false, error: "OpenAI ключът трябва да започва с 'sk-'" };
    } else {
      try {
        const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${openaiApiKey}` } });
        results.openai = res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
      } catch (e) { results.openai = { ok: false, error: (e as Error).message }; }
    }
  }

  // 2. Apify
  if (apifyToken) {
    if (!apifyToken.startsWith("apify_api_")) {
      results.apify = { ok: false, error: "Apify токенът трябва да започва с 'apify_api_'" };
    } else {
      try {
        const res = await fetch(`https://api.apify.com/v2/users/me?token=${apifyToken}`);
        results.apify = res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
      } catch (e) { results.apify = { ok: false, error: (e as Error).message }; }
    }
  }

  // 3. Hunter (optional)
  if (hunterApiKey) {
    try {
      const res = await fetch(`https://api.hunter.io/v2/account?api_key=${hunterApiKey}`);
      results.hunter = res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    } catch (e) { results.hunter = { ok: false, error: (e as Error).message }; }
  }

  // 4. Resend
  if (resendApiKey) {
    if (!resendApiKey.startsWith("re_")) {
      results.resend = { ok: false, error: "Resend ключът трябва да започва с 're_'" };
    } else {
      try {
        const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendApiKey}` } });
        results.resend = res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
      } catch (e) { results.resend = { ok: false, error: (e as Error).message }; }
    }
  }

  // Stop if any required key failed validation
  const hasInvalidRequired = (results.openai?.ok === false) || (results.apify?.ok === false) || (results.resend?.ok === false);
  if (hasInvalidRequired) {
    return { success: false, results, error: "Един или повече ключове са невалидни — виж детайлите по-долу." };
  }

  // Save (set to null if cleared)
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      openaiApiKey,
      apifyToken,
      hunterApiKey,
      resendApiKey,
      resendFromEmail,
      resendFromName,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true, results };
}

/** Legacy alias for backward compat */
export const updateEmailConfigAction = updateApiKeysAction;

export async function updateFollowupConfigAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const enabled = formData.get("followupEnabled") === "on" || formData.get("followupEnabled") === "true";
  const delayHours = Math.max(1, Math.min(720, parseInt(formData.get("followupDelayHours")?.toString() ?? "72")));
  const maxSteps = Math.max(0, Math.min(5, parseInt(formData.get("followupMaxSteps")?.toString() ?? "2")));

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { followupEnabled: enabled, followupDelayHours: delayHours, followupMaxSteps: maxSteps },
  });

  revalidatePath("/settings");
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

  const openaiKey = workspace.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { success: false, error: "Свържи OpenAI API ключ в Настройки → API ключове" };
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
