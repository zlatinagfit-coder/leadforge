import { NextRequest, NextResponse } from "next/server";
import { findEmailsForDomain, verifyEmail } from "@/lib/integrations/emailFinder";

/**
 * POST /api/email-finder
 * Body: { domain: string }
 */
export async function POST(req: NextRequest) {
  const { domain } = await req.json();
  if (!domain) return NextResponse.json({ error: "Missing domain" }, { status: 400 });

  const emails = await findEmailsForDomain(domain);
  const verified = await Promise.all(
    emails.map(async (e) => ({ ...e, verification: await verifyEmail(e.email) }))
  );

  return NextResponse.json({ emails: verified });
}
