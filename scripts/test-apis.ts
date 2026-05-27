/**
 * Test script — verifies all 3 API integrations work without exposing keys to logs.
 * Run: npx tsx scripts/test-apis.ts
 */
import "dotenv/config";

const MASK = (s: string | undefined) => (s ? `${s.slice(0, 8)}...${s.slice(-4)} (${s.length} chars)` : "❌ MISSING");

async function testOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, msg: "OPENAI_API_KEY missing in .env" };
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const err = await res.json();
      return { ok: false, msg: `HTTP ${res.status} — ${err?.error?.message ?? "Unknown error"}` };
    }
    const data = await res.json();
    const models = data.data?.length ?? 0;
    return { ok: true, msg: `Authenticated · ${models} models available` };
  } catch (e) {
    return { ok: false, msg: `Network: ${(e as Error).message}` };
  }
}

async function testResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, msg: "RESEND_API_KEY missing in .env" };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const err = await res.json();
      return { ok: false, msg: `HTTP ${res.status} — ${err?.message ?? "Unknown error"}` };
    }
    const data = await res.json();
    const domains = data.data?.length ?? 0;
    return { ok: true, msg: `Authenticated · ${domains} verified domains${domains === 0 ? " (sandbox mode — only sends to your account email)" : ""}` };
  } catch (e) {
    return { ok: false, msg: `Network: ${(e as Error).message}` };
  }
}

async function testApify() {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { ok: false, msg: "APIFY_TOKEN missing in .env" };
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${token}`);
    if (!res.ok) {
      return { ok: false, msg: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const user = data.data;
    const usd = (user.usageCycle?.usageUsd ?? 0).toFixed(2);
    const limit = (user.plan?.maxMonthlyUsageUsd ?? 5).toFixed(2);
    return { ok: true, msg: `Authenticated · ${user.username ?? user.email} · usage $${usd} / $${limit} this month` };
  } catch (e) {
    return { ok: false, msg: `Network: ${(e as Error).message}` };
  }
}

async function main() {
  console.log("\n🔍 Testing LeadForge API integrations\n");

  console.log("📋 Key presence:");
  console.log(`   OPENAI_API_KEY     ${MASK(process.env.OPENAI_API_KEY)}`);
  console.log(`   RESEND_API_KEY     ${MASK(process.env.RESEND_API_KEY)}`);
  console.log(`   APIFY_TOKEN        ${MASK(process.env.APIFY_TOKEN)}`);
  console.log("");

  const results = await Promise.all([
    testOpenAI().then((r) => ({ name: "OpenAI", ...r })),
    testResend().then((r) => ({ name: "Resend", ...r })),
    testApify().then((r) => ({ name: "Apify ", ...r })),
  ]);

  console.log("🧪 API tests:");
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`   ${icon} ${r.name}  ${r.msg}`);
  }

  const allOk = results.every((r) => r.ok);
  console.log(`\n${allOk ? "🚀 All systems go!" : "⚠️  Fix the failing tests before continuing."}\n`);
  process.exit(allOk ? 0 : 1);
}

main();
