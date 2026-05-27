/**
 * Email sender — изпраща през Resend, Gmail SMTP или SendGrid.
 *
 * 🟢 Resend (препоръчвано за старт): 3000 безплатни/мес, $20/мес за 50k
 * 🟡 Gmail SMTP: лично за всеки потребител, 500/ден лимит
 * 🟠 SendGrid: $20/мес, 40k имейли
 *
 * SETUP:
 *   RESEND_API_KEY от resend.com
 *   FROM_EMAIL (verified domain в Resend)
 */

export type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendEmail(opts: {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  provider?: "resend" | "gmail" | "sendgrid";
  /** Override Resend API key (for per-workspace credentials) */
  apiKey?: string;
}): Promise<SendResult> {
  const provider = opts.provider ?? "resend";

  if (provider === "resend") {
    const apiKey = opts.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("⚠️  No RESEND_API_KEY — stub send");
      return { success: true, messageId: `stub-${Date.now()}` };
    }

    try {
      const fromHeader = opts.fromName ? `${opts.fromName} <${opts.from}>` : opts.from;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromHeader,
          to: [opts.to],
          subject: opts.subject,
          html: textToHtml(opts.body),
          text: opts.body,
          reply_to: opts.replyTo ?? opts.from,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.message ?? "Resend error" };
      return { success: true, messageId: json.id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // TODO: Gmail SMTP via nodemailer
  // TODO: SendGrid via @sendgrid/mail

  return { success: false, error: `Provider ${provider} not yet implemented` };
}

function textToHtml(text: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; line-height: 1.6; color: #0a0a0a;">${text
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;
}
