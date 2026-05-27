import { prisma } from "./prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Returns the authenticated user. Redirects to /login if not authenticated.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  return user;
}

/**
 * Returns the user's primary (first) workspace.
 * Auto-creates one if the user has no workspace yet (defensive fallback).
 */
export async function getCurrentWorkspace() {
  const user = await getCurrentUser();

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (membership?.workspace) return membership.workspace;

  // Defensive: if user has no workspace (data integrity issue), create one
  const slug = (user.name ?? user.email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + user.id.slice(-6);
  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name ?? user.email.split("@")[0]}'s Workspace`,
      slug,
      accentColor: "#E10C2F",
      plan: "trial",
      monthlyQuota: 500,
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
  });
  await prisma.sendingInbox.create({
    data: {
      workspaceId: workspace.id,
      label: "primary",
      provider: "resend",
      fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      fromName: user.name ?? "LeadForge",
      dailyLimit: 50,
      warmedUp: true,
      health: 100,
    },
  });
  return workspace;
}
