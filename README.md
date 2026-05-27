# LeadForge — AI Lead Generation SaaS

White-label платформа за маркетинг агенции. AI агентът обикаля Google Maps, намира имейли, анализира сайтове и праща персонализирани outreach съобщения — носи **50 готови контакта всяка сутрин**.

Стек: **Next.js 14 · Prisma · SQLite (dev) / Postgres (prod) · OpenAI · Resend · Hunter.io**

---

## 🚀 Бърз старт (локално)

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Отвори: **http://localhost:3000** · влизаш автоматично като `Мария Г. · OutboundCo`.

---

## 📋 Какво има в системата (Фаза 1 ✅)

| Страница | Какво показва |
|----------|---------------|
| **Преглед** | KPI cards (lead-ове, изпратени, отговори, срещи), pipeline funnel chart, активни кампании, горещи отговори, нови lead-ове |
| **Lead-ове** | Таблица с всички lead-ове · филтри по статус, ниша, държава · AI score · pain points |
| **Кампании** | Списък с outreach кампании · sent/opened/replied/meetings stats · health score |
| **Inbox** | AI-класифицирани отговори (Hot / Interested / Not interested) · AI suggest reply · threaded view |
| **Pipeline** | Kanban dashboard с 6 стадия · drag-and-drop |
| **Аналитика** | 30-day trend charts · reply rate · niche breakdown · топ кампании |
| **AI Агент** | Live activity feed · текуща мисия · capabilities · 100 last actions |
| **Настройки** | White-label brandиране · екип · sending inboxes · план & билинг |

---

## 🔌 За production — добави API ключове в `.env`

Виж `.env.example`. Минимум:

| Сервис | Защо | Цена | Линк |
|--------|------|------|------|
| **OpenAI** | AI персонализация | $5 минимум, ~$5/мес | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Resend** | Изпращане | 3000/мес безплатно, $20 за 50k | [resend.com](https://resend.com) |
| **Neon Postgres** | Production DB | Безплатен tier | [neon.tech](https://neon.tech) |
| **Vercel** | Hosting | Безплатен tier | [vercel.com](https://vercel.com) |
| **Hunter.io** | Email finder (има fallback) | $49/мес или 25 безплатни | [hunter.io](https://hunter.io) |
| **Apify** | Google Maps scraper | ~$0.20/1000 бизнеса | [apify.com](https://apify.com) |

---

## 🛣️ Roadmap

**Фаза 2** — реални scraping & sending (3-5 дни): Apify, Hunter, OpenAI, Resend, Vercel Cron, IMAP reader
**Фаза 3** — white-label (2-3 дни): NextAuth, workspace switcher, custom subdomains, logo upload
**Фаза 4** — billing (2 дни): Stripe Checkout, webhooks, quota enforcement
**Фаза 5** — sales site (2 дни): pricing page, signup, onboarding wizard

---

## 💼 Бизнес модел

**Target:** Маркетинг агенции (BG, EU) предлагащи lead gen услуга на клиентите си.

| План | Цена | Limits | За кого |
|------|------|--------|---------|
| Starter | $49/мес | 100 lead-а/мес, 1 user | Solo консултант |
| Pro | $149/мес | 500 lead-а/мес, 3 users | Малка агенция |
| Agency | $399/мес | Unlimited, 10 users, white-label, custom domain | Голяма агенция |

**Margin математика:** ~$0.05 cost per lead end-to-end → $124 profit на Pro план.

---

## 🛠️ Команди

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run db:studio        # Prisma Studio (визуален DB browser)
npm run db:seed          # Презареди demo данни
npm run db:reset         # Reset DB + seed (drops everything)
```

---

## ❓ TODO маркери

```bash
grep -r "TODO" src/
```

- `src/lib/workspace.ts` — замени stub с NextAuth session
- `src/lib/integrations/scraper.ts` — Apify / ScrapingBee implementation
- `src/lib/integrations/emailFinder.ts` — verification (ZeroBounce)
- `src/app/api/agent/tick/route.ts` — implementация на agent loop

---

Made with 🔴 за OutboundCo
