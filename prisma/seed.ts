import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding LeadForge database...");

  // Clean slate
  await prisma.aiActivity.deleteMany();
  await prisma.inboxMessage.deleteMany();
  await prisma.inboxThread.deleteMany();
  await prisma.message.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.sendingInbox.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "OutboundCo",
      slug: "outboundco",
      accentColor: "#E10C2F",
      plan: "agency",
      monthlyQuota: 500,
      usedThisMonth: 340,
    },
  });

  // User
  const user = await prisma.user.create({
    data: {
      email: "maria@outboundco.bg",
      name: "Мария Г.",
      emailVerified: new Date(),
    },
  });

  const colleague = await prisma.user.create({
    data: {
      email: "ivan@outboundco.bg",
      name: "Иван П.",
      emailVerified: new Date(),
    },
  });

  await prisma.membership.createMany({
    data: [
      { userId: user.id, workspaceId: workspace.id, role: "owner" },
      { userId: colleague.id, workspaceId: workspace.id, role: "member" },
    ],
  });

  // Sending inboxes
  await prisma.sendingInbox.createMany({
    data: [
      { workspaceId: workspace.id, label: "bg-01", provider: "resend", fromEmail: "maria@outboundco.bg", fromName: "Мария от OutboundCo", dailyLimit: 50, sentToday: 38, warmedUp: true, health: 96 },
      { workspaceId: workspace.id, label: "bg-02", provider: "gmail_smtp", fromEmail: "hello@outboundco.bg", fromName: "OutboundCo Team", dailyLimit: 50, sentToday: 22, warmedUp: true, health: 92 },
      { workspaceId: workspace.id, label: "eu-01", provider: "resend", fromEmail: "team@outboundco.eu", fromName: "OutboundCo EU", dailyLimit: 50, sentToday: 41, warmedUp: false, health: 78 },
    ],
  });

  // Leads (matching data.js)
  const leadsData = [
    { company: "Bright Smile Dental", niche: "Зъболекари", city: "London", country: "UK", website: "brightsmile.co.uk", email: "info@brightsmile.co.uk", phone: "+44 20 7946 0381", status: "new", score: 92, ownerId: null, lastTouchMin: 4, painPoints: ["Няма Meta Pixel", "Стара SEO структура", "Бавен LCP (4.2s)"], industry: "Healthcare", employees: "8–12", revenue: "£1.2M", linkedin: "linkedin.com/company/brightsmile", instagram: "@brightsmile_dental" },
    { company: "PowerHaus Gym", niche: "Фитнес", city: "Berlin", country: "DE", website: "powerhaus.de", email: "team@powerhaus.de", phone: "+49 30 1234 5678", status: "contacted", score: 87, ownerId: null, lastTouchMin: 12, painPoints: ["Няма booking funnel", "Слаба IG активност"], industry: "Fitness", employees: "15–25", revenue: "€2.1M", instagram: "@powerhaus_berlin" },
    { company: "ModaBG", niche: "Ecommerce", city: "София", country: "BG", website: "modabg.bg", email: "sales@modabg.bg", phone: "+359 2 988 1234", status: "replied", score: 96, ownerId: null, lastTouchMin: 38, painPoints: ["Висок cart abandonment (78%)", "Няма email flows", "Слаб mobile UX"], industry: "Retail / Fashion", employees: "20–40", revenue: "€3.8M", linkedin: "linkedin.com/company/modabg", instagram: "@modabg_official" },
    { company: "Burj Properties", niche: "Недвижими имоти", city: "Dubai", country: "AE", website: "burjproperties.ae", email: "hello@burjproperties.ae", phone: "+971 4 555 8842", status: "interested", score: 89, ownerId: colleague.id, lastTouchMin: 62, painPoints: ["Няма CRM интеграция", "Slow lead response (>48h)"], industry: "Real Estate", employees: "40–80", revenue: "$12M", linkedin: "linkedin.com/company/burj-properties" },
    { company: "London Smiles Clinic", niche: "Зъболекари", city: "London", country: "UK", website: "londonsmiles.co.uk", email: "reception@londonsmiles.co.uk", phone: "+44 20 7388 2200", status: "meeting", score: 94, ownerId: user.id, lastTouchMin: 122, painPoints: ["Outdated дизайн", "Няма online запази час"], industry: "Healthcare", employees: "6–10", revenue: "£900K", linkedin: "linkedin.com/company/london-smiles" },
    { company: "CrossFit Mitte", niche: "Фитнес", city: "Berlin", country: "DE", website: "cfmitte.de", email: "box@cfmitte.de", phone: "+49 30 9988 4421", status: "new", score: 78, ownerId: null, lastTouchMin: 8, painPoints: ["Слаб Google Ads ROAS (0.8x)", "Няма retargeting"], industry: "Fitness", employees: "5–8", revenue: "€720K", instagram: "@cfmitte" },
    { company: "EcoStore.bg", niche: "Ecommerce", city: "Пловдив", country: "BG", website: "ecostore.bg", email: "office@ecostore.bg", phone: "+359 32 555 110", status: "contacted", score: 81, ownerId: null, lastTouchMin: 22, painPoints: ["Няма loyalty program", "Слаба email база"], industry: "Retail / Eco", employees: "12–18", revenue: "€1.4M", linkedin: "linkedin.com/company/ecostore-bg", instagram: "@ecostore.bg" },
    { company: "Marina Heights Realty", niche: "Недвижими имоти", city: "Dubai", country: "AE", website: "marinaheights.ae", email: "team@marinaheights.ae", phone: "+971 4 777 1102", status: "replied", score: 91, ownerId: null, lastTouchMin: 51, painPoints: ["Lead response time >24h", "Слаб follow-up flow"], industry: "Real Estate", employees: "25–45", revenue: "$8.4M", linkedin: "linkedin.com/company/marina-heights", instagram: "@marinaheights" },
    { company: "Hackney Dental Studio", niche: "Зъболекари", city: "London", country: "UK", website: "hackneydental.co.uk", email: "info@hackneydental.co.uk", phone: "+44 20 7254 9911", status: "new", score: 85, ownerId: null, lastTouchMin: 18, painPoints: ["Слаб GMB профил", "Няма Meta Pixel"], industry: "Healthcare", employees: "4–7", revenue: "£540K", instagram: "@hackneydental" },
    { company: "Kreuzberg Athletics", niche: "Фитнес", city: "Berlin", country: "DE", website: "kreuzbergathletics.de", email: "info@kreuzbergathletics.de", phone: "+49 30 4422 8810", status: "closed", score: 88, ownerId: user.id, lastTouchMin: 60 * 26, painPoints: ["Conversion <2%", "Pricing страница слаба"], industry: "Fitness", employees: "10–15", revenue: "€1.1M", linkedin: "linkedin.com/company/kreuzberg-athletics", instagram: "@kreuzberg.athletics" },
    { company: "TechWear.bg", niche: "Ecommerce", city: "Варна", country: "BG", website: "techwear.bg", email: "sales@techwear.bg", phone: "+359 52 887 220", status: "interested", score: 90, ownerId: null, lastTouchMin: 60 * 4, painPoints: ["Висок CAC (€84)", "Няма UGC стратегия"], industry: "Retail / Tech", employees: "8–14", revenue: "€2.6M", linkedin: "linkedin.com/company/techwear-bg", instagram: "@techwear.bg" },
    { company: "Palm Jumeirah Estates", niche: "Недвижими имоти", city: "Dubai", country: "AE", website: "palmjumeirah.ae", email: "hello@palmjumeirah.ae", phone: "+971 4 555 9921", status: "new", score: 76, ownerId: null, lastTouchMin: 28, painPoints: ["Slow website (5.8s LCP)", "Няма WhatsApp интеграция"], industry: "Real Estate", employees: "30–50", revenue: "$6.2M", linkedin: "linkedin.com/company/palm-jumeirah" },
    // Extra leads to reach a richer demo
    { company: "Pizza Romana", niche: "Ресторанти", city: "София", country: "BG", website: "pizzaromana.bg", email: "info@pizzaromana.bg", phone: "+359 2 444 7711", status: "new", score: 73, ownerId: null, lastTouchMin: 14, painPoints: ["Няма online поръчки", "Слаба GMB активност"], industry: "F&B", employees: "8–14", revenue: "€420K" },
    { company: "LegalPro Sofia", niche: "Адвокати", city: "София", country: "BG", website: "legalpro.bg", email: "contact@legalpro.bg", phone: "+359 2 555 9988", status: "contacted", score: 82, ownerId: null, lastTouchMin: 33, painPoints: ["Стар сайт", "Няма online consultation"], industry: "Legal", employees: "12–20", revenue: "€1.8M" },
    { company: "Vape Shop EU", niche: "Ecommerce", city: "Sofia", country: "BG", website: "vapeshop.eu", email: "orders@vapeshop.eu", phone: "+359 88 100 2233", status: "interested", score: 88, ownerId: colleague.id, lastTouchMin: 60 * 2, painPoints: ["Висок refund rate", "Слаб AOV"], industry: "Retail", employees: "6–10", revenue: "€2.1M" },
    { company: "Studio Pilates Plovdiv", niche: "Фитнес", city: "Пловдив", country: "BG", website: "pilatespdv.bg", email: "studio@pilatespdv.bg", phone: "+359 32 444 1198", status: "new", score: 71, ownerId: null, lastTouchMin: 6, painPoints: ["Няма booking online", "Слаб social"], industry: "Fitness", employees: "3–5", revenue: "€280K" },
    { company: "Sunset Realty Burgas", niche: "Недвижими имоти", city: "Бургас", country: "BG", website: "sunset-realty.bg", email: "office@sunset-realty.bg", phone: "+359 56 111 2200", status: "replied", score: 84, ownerId: null, lastTouchMin: 44, painPoints: ["Slow site", "Няма video tour"], industry: "Real Estate", employees: "10–18", revenue: "€1.2M" },
  ];

  const leads = [];
  for (const ld of leadsData) {
    const { lastTouchMin, painPoints, ...rest } = ld;
    const lead = await prisma.lead.create({
      data: {
        ...rest,
        workspaceId: workspace.id,
        painPoints: JSON.stringify(painPoints),
        lastTouchAt: new Date(Date.now() - lastTouchMin * 60_000),
      },
    });
    leads.push(lead);
  }

  // Campaigns
  await prisma.campaign.createMany({
    data: [
      { workspaceId: workspace.id, name: "EU Dental · Q2 Outreach", niche: "Зъболекари", status: "active", sent: 1842, opened: 1124, replied: 287, meetings: 41, health: 96, targetCountry: "UK,DE,BG" },
      { workspaceId: workspace.id, name: "DE Fitness · Cold", niche: "Фитнес", status: "active", sent: 920, opened: 521, replied: 142, meetings: 19, health: 88, targetCountry: "DE" },
      { workspaceId: workspace.id, name: "BG Ecom · Black Friday Prep", niche: "Ecommerce", status: "active", sent: 2104, opened: 1389, replied: 401, meetings: 62, health: 94, targetCountry: "BG" },
      { workspaceId: workspace.id, name: "Dubai Realty · Premium", niche: "Недвижими имоти", status: "paused", sent: 612, opened: 388, replied: 88, meetings: 12, health: 71, targetCountry: "AE" },
      { workspaceId: workspace.id, name: "UK Dental · Retargeting", niche: "Зъболекари", status: "active", sent: 488, opened: 311, replied: 92, meetings: 14, health: 90, targetCountry: "UK" },
      { workspaceId: workspace.id, name: "BG Ресторанти · Pilot", niche: "Ресторанти", status: "draft", sent: 0, opened: 0, replied: 0, meetings: 0, health: 100, targetCountry: "BG" },
    ],
  });

  // Inbox threads
  const inboxData = [
    { from: "Sarah Hughes", company: "Bright Smile Dental", email: "sarah@brightsmile.co.uk", subject: "Re: Бърз въпрос за вашия пациент funnel", preview: "Здравейте, благодаря за писмото — наистина забелязах, че имаме проблем с прехвърлянето на пациенти от Google search към запис на час. Кога може да говорим?", min: 12, unread: true, sentiment: "positive", intent: "hot", leadIdx: 0 },
    { from: "Klaus Mueller", company: "PowerHaus Gym", email: "klaus@powerhaus.de", subject: "Re: 15-min call?", preview: "Hi — interested. Can we schedule a 15-min call this Thursday or Friday? Best times are mornings.", min: 76, unread: true, sentiment: "positive", intent: "interested", leadIdx: 1 },
    { from: "Иван Димитров", company: "ModaBG", email: "ivan@modabg.bg", subject: "Re: Cart abandonment 78%", preview: "Изпратете повече детайли за pricing-а ви. Имаме нужда от case studies за fashion ecommerce.", min: 134, unread: true, sentiment: "neutral", intent: "interested", leadIdx: 2 },
    { from: "Ahmed Al-Rashid", company: "Burj Properties", email: "ahmed@burjproperties.ae", subject: "Re: Lead response time", preview: "Please remove me from your list. Not interested at this time.", min: 220, unread: false, sentiment: "negative", intent: "not_interested", leadIdx: 3 },
    { from: "Emma Wilson", company: "London Smiles Clinic", email: "emma@londonsmiles.co.uk", subject: "Re: Friday call confirmed", preview: "Booked for Friday at 2:30 PM — looking forward to it! Will share my calendar invite shortly.", min: 305, unread: false, sentiment: "positive", intent: "hot", leadIdx: 4 },
    { from: "Marcus Bauer", company: "CrossFit Mitte", email: "marcus@cfmitte.de", subject: "Re: ROAS 0.8x", preview: "Send me your case studies for fitness brands. Especially CrossFit-style boxes if you have any.", min: 60 * 26, unread: false, sentiment: "positive", intent: "interested", leadIdx: 5 },
    { from: "Петя Стоянова", company: "EcoStore.bg", email: "petya@ecostore.bg", subject: "Re: Email flows предложение", preview: "Интересно е, но имаме нужда от одобрение от собственика. Ще се върна в края на седмицата.", min: 60 * 30, unread: false, sentiment: "neutral", intent: "interested", leadIdx: 6 },
  ];

  for (const t of inboxData) {
    const lead = leads[t.leadIdx];
    const thread = await prisma.inboxThread.create({
      data: {
        workspaceId: workspace.id,
        leadId: lead?.id,
        fromName: t.from,
        fromEmail: t.email,
        fromCompany: t.company,
        subject: t.subject,
        lastPreview: t.preview,
        lastAt: new Date(Date.now() - t.min * 60_000),
        unread: t.unread,
        sentiment: t.sentiment,
        intent: t.intent,
      },
    });
    // One outbound + one inbound for realism
    await prisma.inboxMessage.create({
      data: {
        threadId: thread.id,
        direction: "outbound",
        fromEmail: "maria@outboundco.bg",
        toEmail: t.email,
        subject: t.subject.replace(/^Re:\s*/, ""),
        body: "Здравейте, видях сайта на " + t.company + " и забелязах няколко конкретни проблема които вероятно ви струват клиенти всеки месец. Имаме система която ги решава за бизнеси като вашия. Имате ли 15 минути този петък?",
        at: new Date(Date.now() - (t.min + 60 * 12) * 60_000),
      },
    });
    await prisma.inboxMessage.create({
      data: {
        threadId: thread.id,
        direction: "inbound",
        fromEmail: t.email,
        toEmail: "maria@outboundco.bg",
        subject: t.subject,
        body: t.preview,
        at: new Date(Date.now() - t.min * 60_000),
      },
    });
  }

  // AI activity feed
  const activityData = [
    { kind: "scrape",   tag: "Scraper",    min: 0,   text: "Скрейпнах 47 нови бизнеси от Google Maps — \"dentists in Manchester\"" },
    { kind: "analyze",  tag: "Analyzer",   min: 1,   text: "Bright Smile Dental анализиран · score 92 · 3 pain points идентифицирани" },
    { kind: "compose",  tag: "Writer",     min: 2,   text: "Генерирах персонализиран outreach за Marina Heights Realty" },
    { kind: "send",     tag: "Sender",     min: 4,   text: "Изпратени 23 email-а през \"Sequence-EU-Q2\" (inbox: bg-01)" },
    { kind: "reply",    tag: "Classifier", min: 6,   text: "ModaBG отговори — класифициран като \"Hot · Interested\"" },
    { kind: "meeting",  tag: "Agent",      min: 8,   text: "London Smiles Clinic — booked meeting Пет, 14:30 (Cal.com)" },
    { kind: "followup", tag: "Sender",     min: 11,  text: "Изпратен Follow-up #2 към 14 lead-а (40h delay rule)" },
    { kind: "analyze",  tag: "Analyzer",   min: 14,  text: "CrossFit Mitte анализиран · score 78 · слаб ROAS detected" },
    { kind: "scrape",   tag: "Scraper",    min: 22,  text: "Открити 63 нови ресторанта в София — Google Maps + Foursquare cross-ref" },
    { kind: "compose",  tag: "Writer",     min: 28,  text: "Pregenerated 50 outreach variations за \"BG Restaurants Pilot\"" },
    { kind: "reply",    tag: "Classifier", min: 35,  text: "Petya Stoyanova (EcoStore) — Hot · Interested · suggests Friday call" },
    { kind: "send",     tag: "Sender",     min: 42,  text: "Изпратени 18 email-а през Sequence-DE (inbox: eu-01)" },
    { kind: "error",    tag: "Agent",      min: 48,  text: "Inbox eu-01 health drop до 78% — препоръчвам warm-up период от 5 дни" },
    { kind: "meeting",  tag: "Agent",      min: 56,  text: "TechWear.bg прехвърлен в Pipeline → Interested (от colleague Иван)" },
    { kind: "scrape",   tag: "Scraper",    min: 62,  text: "Завършен scrape на 120 фитнес клуба в Berlin · valid emails: 89" },
    { kind: "followup", tag: "Sender",     min: 78,  text: "Auto follow-up #1 пуснат за 31 lead-а (без отговор след 3 дни)" },
  ];

  for (const a of activityData) {
    await prisma.aiActivity.create({
      data: {
        workspaceId: workspace.id,
        kind: a.kind,
        tag: a.tag,
        text: a.text,
        createdAt: new Date(Date.now() - a.min * 60_000),
      },
    });
  }

  console.log(`✅ Seeded: 1 workspace, 2 users, ${leads.length} leads, 6 campaigns, ${inboxData.length} inbox threads, ${activityData.length} activity events`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
