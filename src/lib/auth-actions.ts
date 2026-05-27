"use server";

import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export type SignupResult = { success: boolean; error?: string };

export async function signupAction(prevState: SignupResult | undefined, formData: FormData): Promise<SignupResult> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().toLowerCase().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const workspaceName = formData.get("workspace")?.toString().trim() ?? "";

  if (!email || !password || !name) return { success: false, error: "Попълни всички полета" };
  if (password.length < 6) return { success: false, error: "Паролата трябва да е поне 6 символа" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { success: false, error: "Този имейл вече е регистриран" };

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user + workspace + membership + primary sending inbox in one transaction
  const user = await prisma.user.create({
    data: { email, name, passwordHash, emailVerified: new Date() },
  });

  const wsName = workspaceName || `${name}'s Workspace`;
  const baseSlug = wsName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const slug = `${baseSlug || "workspace"}-${user.id.slice(-6)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name: wsName,
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
      fromName: name,
      dailyLimit: 50,
      warmedUp: true,
      health: 100,
    },
  });

  await prisma.aiActivity.create({
    data: { workspaceId: workspace.id, kind: "compose", tag: "System", text: `Workspace създаден от ${name}. Welcome to LeadForge!` },
  });

  // Sign in the new user immediately (formData has email + password)
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    // If auto sign-in fails, user can still log in manually
  }

  redirect("/");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
