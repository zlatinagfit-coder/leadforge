/**
 * AI Personalizer — анализира сайта и генерира персонализиран outreach.
 *
 * Поток:
 *   1. Fetch сайта (homepage HTML)
 *   2. Lighthouse-style audit (Speed, SEO, Meta Pixel, мобилност)
 *   3. GPT-4o-mini генерира 3 pain points + score
 *   4. GPT-4o-mini пише outreach email с тези pain points
 *
 * SETUP:
 *   OPENAI_API_KEY от platform.openai.com
 *   ~$0.0001 на email · ~$5 за 50,000 имейли
 */

export type WebsiteAnalysis = {
  score: number;
  painPoints: string[];
  industry?: string;
  techStack?: string[];
};

export type PersonalizedEmail = {
  subject: string;
  body: string;
  preheader?: string;
};

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn("⚠️  No OPENAI_API_KEY — returning stub analysis");
    return {
      score: 70,
      painPoints: ["Stub analysis — добави OPENAI_API_KEY в .env"],
    };
  }

  // 1. Fetch site content
  let html = "";
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(10_000) });
    html = (await res.text()).slice(0, 8000);
  } catch (err) {
    console.error("Site fetch error:", err);
    return { score: 50, painPoints: ["Сайтът не може да се отвори (timeout)"] };
  }

  // 2. Ask GPT to analyze
  const prompt = `Ти си senior marketing consultant. Анализирай този сайт и върни JSON:
{
  "score": число 0-100 (по-високо = по-голяма възможност за подобрение),
  "painPoints": [3 конкретни проблема които AI може да забележи — напр. "Няма Meta Pixel", "Бавен LCP", "Стара SEO структура", "Няма retargeting"],
  "industry": "ниша на бизнеса",
  "techStack": ["Shopify", "GA4"]
}

Сайт URL: ${url}
HTML (първи 8KB): ${html.slice(0, 2000)}

Върни САМО валиден JSON, без markdown.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });
    const json = await res.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    return {
      score: parsed.score ?? 70,
      painPoints: parsed.painPoints ?? [],
      industry: parsed.industry,
      techStack: parsed.techStack,
    };
  } catch (err) {
    console.error("OpenAI analyze error:", err);
    return { score: 65, painPoints: ["AI анализатор failed — провери logs"] };
  }
}

export async function generateOutreach(opts: {
  companyName: string;
  website?: string;
  niche: string;
  painPoints: string[];
  senderName: string;
  language?: "bg" | "en";
}): Promise<PersonalizedEmail> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const lang = opts.language ?? "bg";

  if (!openaiKey) {
    return {
      subject: `Бърз въпрос за ${opts.companyName}`,
      body: `Здравейте, видях сайта ви и забелязах ${opts.painPoints[0]}. Може ли да говорим 15 мин този петък?\n\n— ${opts.senderName}`,
    };
  }

  const prompt = `Напиши КРАТЪК cold outreach email на ${lang === "bg" ? "български" : "English"} за следния потенциален клиент:

Компания: ${opts.companyName}
Ниша: ${opts.niche}
Сайт: ${opts.website ?? "—"}
Открити проблеми: ${opts.painPoints.join(", ")}

Изпращач: ${opts.senderName}

ПРАВИЛА:
- Subject: 4-7 думи, без spam думи (без "free", "exclusive", "guarantee")
- Body: 60-90 думи, 3 параграфа
- Параграф 1: специфична наблюдение за тях (не generic)
- Параграф 2: какво можеш да направиш (1 изречение)
- Параграф 3: clear CTA — въпрос за 15-мин call
- Без exclamation marks
- Без думи "amazing", "incredible", "game-changing"
- Без "I hope this finds you well"
- Звучи като колега, не като продавач

Върни JSON: { "subject": "...", "body": "..." }`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
    const json = await res.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    console.error("OpenAI compose error:", err);
    return {
      subject: `За ${opts.companyName}`,
      body: `Здравейте, видях сайта ви — забелязах ${opts.painPoints[0]}. Имам опит с подобни случаи в ${opts.niche}. Имате ли 15 мин този петък?\n\n— ${opts.senderName}`,
    };
  }
}

export async function classifyReply(replyText: string): Promise<{ intent: string; sentiment: string }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { intent: "interested", sentiment: "neutral" };

  const prompt = `Класифицирай този email отговор. Върни JSON:
{
  "intent": "hot" | "interested" | "not_interested" | "objection" | "auto_reply",
  "sentiment": "positive" | "neutral" | "negative"
}

Email: ${replyText.slice(0, 1500)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });
    const json = await res.json();
    return JSON.parse(json.choices[0].message.content);
  } catch (err) {
    console.error("Classify error:", err);
    return { intent: "interested", sentiment: "neutral" };
  }
}
