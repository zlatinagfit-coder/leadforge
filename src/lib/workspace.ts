// Lightweight workspace context resolver.
// In production this resolves from session/JWT — for now returns the first seeded workspace + user.

import { prisma } from "./prisma";

export async function getCurrentWorkspace() {
  // TODO: replace with NextAuth session lookup
  const ws = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!ws) throw new Error("No workspace found — run `npm run db:seed`");
  return ws;
}

export async function getCurrentUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!user) throw new Error("No user found — run `npm run db:seed`");
  return user;
}
