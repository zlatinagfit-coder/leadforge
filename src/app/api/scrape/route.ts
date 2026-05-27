import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/lib/workspace";
import { scrapeGoogleMaps } from "@/lib/integrations/scraper";
import { findEmailsForDomain } from "@/lib/integrations/emailFinder";
import { analyzeWebsite } from "@/lib/integrations/aiPersonalizer";

/**
 * POST /api/scrape
 * Body: { query: string, niche: string, limit?: number }
 *
 * Pipeline:
 *   1. Скрейпва Google Maps по query
 *   2. За всеки бизнес намира имейл (Hunter + pattern)
 *   3. Анализира сайта (GPT) → pain points + score
 *   4. Запазва като Lead в DB
 *   5. Логва в AiActivity feed
 */
export async function POST(req: NextRequest) {
  const { query, niche, limit = 50 } = await req.json();
  if (!query || !niche) {
    return NextResponse.json({ error: "Missing query or niche" }, { status: 400 });
  }

  const workspace = await getCurrentWorkspace();

  // 1. Scrape
  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "scrape", tag: "Scraper", text: `Започвам scrape за "${query}"` },
  });

  const businesses = await scrapeGoogleMaps(query, limit);

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "scrape", tag: "Scraper", text: `Скрейпнах ${businesses.length} нови бизнеси от Google Maps — "${query}"` },
  });

  // 2-4. Process each
  const created = [];
  for (const biz of businesses) {
    if (!biz.website) continue;
    const domain = biz.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const emails = await findEmailsForDomain(domain);
    const bestEmail = emails.sort((a, b) => b.confidence - a.confidence)[0];

    const analysis = await analyzeWebsite(biz.website);

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
      data: { workspaceId: workspace.id, kind: "analyze", tag: "Analyzer", text: `${biz.name} анализиран · score ${analysis.score} · ${analysis.painPoints.length} pain points` },
    });
  }

  return NextResponse.json({ created: created.length, leads: created });
}
