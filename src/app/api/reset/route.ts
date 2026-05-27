/**
 * POST /api/reset?secret=<CRON_SECRET>
 *
 * Wipes ALL data except the workspace + owner user, leaving you with a clean machine
 * ready for real production use. No demo leads, no fake campaigns, no fake activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    await prisma.aiActivity.deleteMany();
    await prisma.inboxMessage.deleteMany();
    await prisma.inboxThread.deleteMany();
    await prisma.message.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.lead.deleteMany();

    // Keep the existing workspace + user, but ensure there's at least one
    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: "LeadForge HQ", slug: "leadforge-hq", accentColor: "#E10C2F", plan: "agency", monthlyQuota: 500, usedThisMonth: 0 },
      });
    } else {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { usedThisMonth: 0 },
      });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "zlatinagfit@gmail.com", name: "Zlatina G.", emailVerified: new Date() },
      });
      await prisma.membership.create({
        data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
      });
    }

    // Reset sending inboxes counters but keep them
    const inboxCount = await prisma.sendingInbox.count({ where: { workspaceId: workspace.id } });
    if (inboxCount === 0) {
      await prisma.sendingInbox.create({
        data: {
          workspaceId: workspace.id,
          label: "primary",
          provider: "resend",
          fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
          fromName: process.env.RESEND_FROM_NAME ?? "LeadForge",
          dailyLimit: 100,
          sentToday: 0,
          warmedUp: true,
          health: 100,
        },
      });
    } else {
      await prisma.sendingInbox.updateMany({
        where: { workspaceId: workspace.id },
        data: { sentToday: 0, health: 100 },
      });
    }

    await prisma.aiActivity.create({
      data: { workspaceId: workspace.id, kind: "compose", tag: "System", text: "Машината е reset-ната — чиста база, готова за реална работа" },
    });

    return NextResponse.json({
      success: true,
      message: "Cleaned. Now click 'Намери нови' or use the AI prompt to start finding real leads.",
      workspaceId: workspace.id,
      userEmail: user.email,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
