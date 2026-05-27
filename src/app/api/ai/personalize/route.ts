import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOutreach, analyzeWebsite } from "@/lib/integrations/aiPersonalizer";
import { getCurrentWorkspace, getCurrentUser } from "@/lib/workspace";

/**
 * POST /api/ai/personalize
 * Body: { leadId: string }
 *
 * Генерира персонализиран outreach за конкретен lead.
 */
export async function POST(req: NextRequest) {
  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

  const workspace = await getCurrentWorkspace();
  const user = await getCurrentUser();

  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let pains: string[] = lead.painPoints ? JSON.parse(lead.painPoints) : [];

  // Re-analyze if no pains
  if (pains.length === 0 && lead.website) {
    const analysis = await analyzeWebsite(lead.website);
    pains = analysis.painPoints;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { painPoints: JSON.stringify(pains), score: analysis.score },
    });
  }

  const email = await generateOutreach({
    companyName: lead.company,
    website: lead.website ?? undefined,
    niche: lead.niche,
    painPoints: pains,
    senderName: user.name ?? "Екипът",
    language: "bg",
  });

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "Writer", text: `Генерирах персонализиран outreach за ${lead.company}` },
  });

  return NextResponse.json({ email, lead });
}
