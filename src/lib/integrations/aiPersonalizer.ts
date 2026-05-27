/**
 * AI Personalizer — analyzes a business website + generates outreach.
 *
 * Models used: gpt-4o-mini (~$0.0002 per analysis, ~$0.0001 per outreach)
 */

export type WebsiteAnalysis = {
  score: number;
  painPoints: string[];          // legacy — kept for backward compat
  strengths: string[];           // what works well
  weaknesses: string[];          // what's broken or missing
  usagePatterns: string[];       // how prospects/customers use the site
  funnelGaps: string[];          // missing conversion elements
  hasWebsite: boolean;
  websiteReachable: boolean;
  industry?: string;
  techStack?: string[];
  summary?: string;              // one-paragraph plain-English summary
};

export type PersonalizedEmail = {
  subject: string;
  body: string;
  preheader?: string;
};

const FALLBACK_ANALYSIS: WebsiteAnalysis = {
  score: 60,
  painPoints: [],
  strengths: [],
  weaknesses: ["Сайтът не отговори навреме"],
  usagePatterns: [],
  funnelGaps: [],
  hasWebsite: false,
  websiteReachable: false,
  summary: "Сайтът беше недостъпен по време на анализа.",
};

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!url || !url.trim()) {
    return { ...FALLBACK_ANALYSIS, hasWebsite: false, weaknesses: ["Няма уебсайт"], summary: "Този бизнес не предоставя уебсайт." };
  }

  // 1. Fetch site
  let html = "";
  let reachable = false;
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 LeadForge/1.0" },
    });
    html = (await res.text()).slice(0, 12000);
    reachable = res.ok;
  } catch (err) {
    return { ...FALLBACK_ANALYSIS, hasWebsite: true, websiteReachable: false, weaknesses: ["Сайтът не отговори (timeout)", "Възможно бавно зареждане или DNS проблем"] };
  }

  if (!openaiKey) {
    return {
      score: 65,
      painPoints: ["Stub analysis"],
      strengths: ["Има уебсайт"],
      weaknesses: ["AI анализатор не е конфигуриран"],
      usagePatterns: [],
      funnelGaps: [],
      hasWebsite: true,
      websiteReachable: reachable,
      summary: "OPENAI_API_KEY не е зададен — добави го в .env за пълен анализ.",
    };
  }

  // 2. Ask GPT for rich analysis
  const prompt = `Ти си senior marketing & UX consultant. Анализирай този B2B/B2C сайт и върни JSON със следната структура (на български):

{
  "score": число 0-100,                  // колко добре изпълнява предназначението си
  "industry": "ниша на бизнеса",
  "techStack": ["Shopify","GA4",...],     // tech stack ако се вижда
  "strengths": [3-4 силни страни],        // напр. "Бърз LCP (1.2s)", "Ясно CTA", "Добра SEO структура"
  "weaknesses": [3-5 слабости],            // напр. "Няма Meta Pixel", "Слаб mobile UX"
  "usagePatterns": [2-3 как се ползва],   // напр. "Посетителите търсят цени без да намират", "Главното CTA води към контактна форма"
  "funnelGaps": [2-3 missing елемента],   // напр. "Няма exit-intent popup", "Без email capture"
  "summary": "1-2 изречения plain-English обобщение на цялата ситуация"
}

ВАЖНО: Бъди КОНКРЕТЕН и СПЕЦИФИЧЕН за този сайт. Не повтаряй generic неща като "няма Meta Pixel" освен ако наистина не виждаш че липсва. Гледай реалното съдържание.

Сайт URL: ${url}
HTML (първи 12KB):
${html.slice(0, 4000)}

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
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const weaknesses: string[] = parsed.weaknesses ?? [];
    const painPoints = weaknesses.slice(0, 5); // legacy

    return {
      score: parsed.score ?? 65,
      painPoints,
      strengths: parsed.strengths ?? [],
      weaknesses,
      usagePatterns: parsed.usagePatterns ?? [],
      funnelGaps: parsed.funnelGaps ?? [],
      hasWebsite: true,
      websiteReachable: reachable,
      industry: parsed.industry,
      techStack: parsed.techStack ?? [],
      summary: parsed.summary,
    };
  } catch (err) {
    console.error("OpenAI analyze error:", err);
    return { ...FALLBACK_ANALYSIS, hasWebsite: true, websiteReachable: reachable, weaknesses: ["AI анализатор failed — провери logs"] };
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
      body: `Здравейте,\n\nВидях сайта ви и забелязах ${opts.painPoints[0] ?? "няколко неща за подобрение"}. Може ли да говорим 15 мин този петък?\n\n— ${opts.senderName}`,
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
- Параграф 1: специфично наблюдение за тях (не generic)
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
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    console.error("OpenAI compose error:", err);
    return {
      subject: `За ${opts.companyName}`,
      body: `Здравейте, видях сайта ви — забелязах ${opts.painPoints[0] ?? "няколко неща за подобрение"}. Имам опит с подобни случаи в ${opts.niche}. Имате ли 15 мин този петък?\n\n— ${opts.senderName}`,
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
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("Classify error:", err);
    return { intent: "interested", sentiment: "neutral" };
  }
}
