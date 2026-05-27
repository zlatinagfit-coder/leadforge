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

  const wipeAll = req.nextUrl.searchParams.get("wipeAll") === "true";

  try {
    await prisma.followUp.deleteMany();
    await prisma.aiActivity.deleteMany();
    await prisma.inboxMessage.deleteMany();
    await prisma.inboxThread.deleteMany();
    await prisma.message.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.sendingInbox.deleteMany();

    if (wipeAll) {
      // Full nuke — wipe users too so anyone can register fresh
      await prisma.membership.deleteMany();
      await prisma.workspace.deleteMany();
      await prisma.user.deleteMany();
      return NextResponse.json({
        success: true,
        message: "Full wipe complete. Go to /signup to create a fresh account.",
      });
    }

    // Soft reset: keep workspaces + users, just empty their data
    const wsCount = await prisma.workspace.count();
    return NextResponse.json({
      success: true,
      message: "Cleaned. Workspaces and users preserved. Use ?wipeAll=true to also delete users.",
      workspacesRemaining: wsCount,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
