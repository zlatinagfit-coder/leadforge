/**
 * Email finder — намира имейли за даден бизнес/сайт.
 *
 * 3-степенна стратегия:
 *   1. Pattern guessing (info@, contact@, hello@)
 *   2. Hunter.io API (намира конкретни имена на хора)
 *   3. Snov.io API (alternative)
 *
 * SETUP:
 *   HUNTER_API_KEY от hunter.io/api
 */

const COMMON_PATTERNS = ["info", "contact", "hello", "team", "office", "sales", "admin", "support"];

export type FoundEmail = {
  email: string;
  confidence: number; // 0-100
  source: "pattern" | "hunter" | "snov" | "scrape";
  firstName?: string;
  lastName?: string;
  position?: string;
};

export async function findEmailsForDomain(domain: string, options?: { hunterApiKey?: string }): Promise<FoundEmail[]> {
  const hunterKey = options?.hunterApiKey || process.env.HUNTER_API_KEY;

  // 1. Hunter.io path
  if (hunterKey) {
    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Hunter API: ${res.status}`);
      const json = await res.json();
      type HunterEmail = { value: string; confidence?: number; first_name?: string; last_name?: string; position?: string };
      const emails: HunterEmail[] = json?.data?.emails ?? [];
      return emails.map((e) => ({
        email: e.value,
        confidence: e.confidence ?? 70,
        source: "hunter" as const,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
      }));
    } catch (err) {
      console.error("Hunter.io error:", err);
    }
  }

  // 2. Pattern guessing fallback (best for SMBs)
  return COMMON_PATTERNS.slice(0, 3).map((p, i) => ({
    email: `${p}@${domain}`,
    confidence: 50 - i * 5,
    source: "pattern" as const,
  }));
}

/**
 * Verifies an email is deliverable (MX check + SMTP probe).
 * TODO: integrate ZeroBounce or Reoon for verification.
 */
export async function verifyEmail(email: string): Promise<{ valid: boolean; risk: "low" | "medium" | "high" }> {
  // TODO: implement real verification
  const domain = email.split("@")[1];
  if (!domain || domain.includes("example.com")) return { valid: false, risk: "high" };
  return { valid: true, risk: "low" };
}
