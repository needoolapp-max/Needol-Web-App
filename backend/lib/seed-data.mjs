// PRD §17 Nigeria soft-launch playbook + §19 acceptance.
// Phase 5 — idempotent dev-only seed data: 50 Lagos providers,
// 30 Need Requests, 10 Help & Guide articles.
//
// Pure data + a single seed() entry per dataset. IO via the existing
// supabase wrappers + the help store. Re-running these is safe — every
// upsert keys on a stable natural id so the second run is a no-op.

import { upsertRow, selectOne, selectMany, insertRow } from "./supabase.mjs";
import { createArticle, findArticleBySlug, updateArticle } from "./help-store.mjs";

// ---------------------------------------------------------------------------
// Lagos provider seed (50 records)
// ---------------------------------------------------------------------------

const LAGOS_FIRST_NAMES = [
  "Ada", "Chinedu", "Tunde", "Funmi", "Ifeoma", "Bola", "Emeka", "Sade",
  "Kelechi", "Ayo", "Nneka", "Seyi", "Obinna", "Yetunde", "Chika",
  "Femi", "Ngozi", "Tobi", "Amaka", "Gbenga", "Uche", "Kemi", "Damilola",
  "Ebuka", "Bukola", "Ifeanyi", "Mojisola", "Olumide", "Chiamaka", "Tayo",
  "Adaeze", "Babatunde", "Olusola", "Hauwa", "Ibrahim", "Aisha", "Musa",
  "Zainab", "Fatima", "Yusuf", "Aminat", "Halima", "Rasheed", "Maryam",
  "Oluwaseun", "Omolara", "Chukwuemeka", "Adebola", "Onyeka", "Toluwani",
];

const LAGOS_LAST_NAMES = [
  "Okafor", "Adeyemi", "Bello", "Okonkwo", "Ojo", "Eze", "Salami",
  "Adebayo", "Lawal", "Akpan", "Nwosu", "Adesanya", "Onuoha",
  "Bankole", "Adekunle", "Okeke", "Olawale", "Iyengar", "Mohammed",
  "Hassan", "Abubakar", "Anyanwu", "Adesina", "Sanni", "Igwe",
  "Olusegun", "Ifeanyi", "Adamu", "Garba", "Bashir", "Ayodeji",
  "Owolabi", "Adetola", "Ladipo", "Tijani", "Kasim", "Oyelaran",
  "Adelakun", "Babatunde", "Adelaja", "Ekwueme", "Achebe", "Nwankwo",
  "Diallo", "Sowemimo", "Akinola", "Olabisi", "Tinuola", "Ogunyemi",
  "Okorocha",
];

const SKILL_LIBRARY = [
  { kind: "service", label: "Solar panel installation" },
  { kind: "service", label: "Web development" },
  { kind: "service", label: "Graphic design" },
  { kind: "service", label: "Wedding photography" },
  { kind: "service", label: "Catering" },
  { kind: "service", label: "Personal training" },
  { kind: "service", label: "Auto mechanic" },
  { kind: "service", label: "Logistics & delivery" },
  { kind: "service", label: "Music production" },
  { kind: "service", label: "Tutoring (mathematics)" },
  { kind: "service", label: "Bookkeeping" },
  { kind: "skill", label: "JavaScript" },
  { kind: "skill", label: "React" },
  { kind: "skill", label: "Node.js" },
  { kind: "skill", label: "Project management" },
  { kind: "skill", label: "Copywriting" },
  { kind: "skill", label: "Brand strategy" },
  { kind: "product", label: "Ankara apparel" },
  { kind: "product", label: "Custom shoes" },
  { kind: "product", label: "Furniture (handmade)" },
];

const LAGOS_AREAS = [
  "Ikeja", "Lekki", "Yaba", "Surulere", "Victoria Island", "Ikoyi",
  "Ajah", "Magodo", "Gbagada", "Maryland", "Festac", "Apapa", "Ojuelegba",
  "Egbeda", "Iyana-Ipaja", "Ojota", "Oshodi", "Mushin", "Ikorodu", "Badagry",
];

const BIO_SNIPPETS = [
  "Lagos-based pro happy to take on remote or on-site work.",
  "Available weekdays and weekends. Quick response on Needool.",
  "Five years experience serving clients across Lagos.",
  "Mainland and Island coverage. Quote requests welcome.",
  "Open to small jobs and long-term contracts alike.",
  "Trained professional with a track record of happy clients.",
  "Reliable, on time, and easy to work with.",
];

function pseudoSeed(i) {
  // Stable rotation so seed N always picks the same names + skills.
  return {
    first: LAGOS_FIRST_NAMES[i % LAGOS_FIRST_NAMES.length],
    last: LAGOS_LAST_NAMES[(i * 7) % LAGOS_LAST_NAMES.length],
    skill: SKILL_LIBRARY[(i * 3) % SKILL_LIBRARY.length],
    secondSkill: SKILL_LIBRARY[(i * 11 + 5) % SKILL_LIBRARY.length],
    area: LAGOS_AREAS[i % LAGOS_AREAS.length],
    bio: BIO_SNIPPETS[i % BIO_SNIPPETS.length],
  };
}

function lagosProviderId(i) {
  return `seed_lagos_${String(i + 1).padStart(3, "0")}`;
}

function lagosProviderUsername(i) {
  const { first, last } = pseudoSeed(i);
  return `${first}.${last}.${i + 1}`.toLowerCase();
}

// Public so the QA matrix can read back what was seeded.
export function lagosProviderPlan(count = 50) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = pseudoSeed(i);
    const id = lagosProviderId(i);
    const username = lagosProviderUsername(i);
    out.push({
      id,
      username,
      email: `${username}@seed.needool.local`,
      name: `${s.first} ${s.last}`,
      area: s.area,
      bio: s.bio,
      accountType: i % 5 === 0 ? "Business" : "Individual",
      skills: [s.skill, s.secondSkill],
    });
  }
  return out;
}

export async function seedLagosProviders({ count = 50 } = {}) {
  const plan = lagosProviderPlan(count);
  let inserted = 0;
  let updated = 0;
  for (const p of plan) {
    const existing = await selectOne("users", `id=eq.${encodeURIComponent(p.id)}&select=id`);
    await upsertRow(
      "users",
      {
        id: p.id,
        email: p.email,
        username: p.username,
        name: p.name,
        first_name: p.name.split(" ")[0],
        last_name: p.name.split(" ").slice(1).join(" "),
        account_type: p.accountType,
        status: "active",
        profile_complete: true,
        bio: p.bio,
        country: "Nigeria",
        state: "Lagos",
        city: p.area,
        referral_code: p.username.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 20),
        active_since: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      "id",
    );
    // Seed two skills, idempotent on (user_id, label).
    for (const skill of p.skills) {
      const existsRow = await selectOne(
        "user_skills",
        `user_id=eq.${encodeURIComponent(p.id)}&label=eq.${encodeURIComponent(skill.label)}&select=id`,
      );
      if (!existsRow) {
        await insertRow(
          "user_skills",
          {
            user_id: p.id,
            kind: skill.kind,
            label: skill.label,
            created_at: new Date().toISOString(),
          },
        );
      }
    }
    if (existing) updated++;
    else inserted++;
  }
  return { count: plan.length, inserted, updated };
}

// ---------------------------------------------------------------------------
// Need Request seed (30 records) — needs a stable author pool, so we lean on
// the Lagos provider seeds. Seed needs land in `status='approved'` so they
// surface in the public feed immediately.
// ---------------------------------------------------------------------------

const NEED_TEMPLATES = [
  { title: "Need an electrician for new outlets", body: "Three new outlets in a 2-bed flat in Ikeja. Available this weekend." },
  { title: "Looking for a wedding photographer", body: "Outdoor ceremony in Lekki, around 200 guests. Need a full-day package." },
  { title: "Help building a Shopify store", body: "Small fashion brand, ready to migrate from Instagram-only sales." },
  { title: "Catering for 50-person office party", body: "End-of-year staff lunch, Victoria Island. Need a Nigerian menu." },
  { title: "Solar setup for home backup power", body: "3-bedroom home in Ajah. ~5kVA, batteries included." },
  { title: "Tutor for SS3 mathematics", body: "Twice a week, online, prepping for WAEC." },
  { title: "Brand strategist for a new startup", body: "Looking for someone who's launched D2C brands in Nigeria before." },
  { title: "Custom Ankara dresses (two-piece set)", body: "For an upcoming family event, traditional cuts." },
  { title: "Need a logo designer", body: "Boutique fitness brand. Modern, minimal." },
  { title: "Help me set up a small bookkeeping system", body: "Sole proprietor, retail goods. Currently spreadsheets-only." },
  { title: "Reliable cleaner for weekly home service", body: "3-bedroom apartment in Magodo Phase 2." },
  { title: "Need someone to fix my Mac keyboard", body: "MacBook Pro 2019, sticky keys. Same-day if possible." },
  { title: "Music producer for an EP", body: "Afrobeats / R&B. Need 4 tracks mixed + mastered." },
  { title: "Help us hire 2 customer-support agents", body: "Remote work, must speak English + Yoruba." },
  { title: "Looking for a real estate agent on the Mainland", body: "Renting a self-con or 1-bedroom, max ₦1.2M/yr." },
  { title: "Need a mechanic who comes to you", body: "Toyota Camry 2015, won't start. Surulere area." },
  { title: "Personal trainer for 3 sessions a week", body: "Lekki Phase 1, mornings preferred." },
  { title: "Bouncer + crowd control for an event", body: "Yaba, 300 people, 6 hours overnight." },
  { title: "Need 100 branded T-shirts for a launch", body: "1-week turnaround, sizes S–XXL." },
  { title: "Looking for a tax consultant", body: "Filed nothing in 18 months — need to catch up safely." },
  { title: "Furniture maker for a custom dining table", body: "Solid wood, seats 8. Open to Mainland workshops." },
  { title: "Need a copywriter for our website", body: "5 pages, B2B SaaS, payments space." },
  { title: "Cleaning crew for a one-off post-construction job", body: "Mainland duplex, ~4 hours." },
  { title: "Hiring a delivery rider (full-time)", body: "Yaba pickup hub, weekdays only." },
  { title: "Need a videographer for product shoots", body: "4 SKUs, need both still + 15-sec reels." },
  { title: "Hairstylist who does home service", body: "Bridal+attendants for Saturday morning shoot." },
  { title: "Need help moving (1-bedroom flat)", body: "Surulere → Lekki Phase 2, this Saturday." },
  { title: "Looking for a phone repair specialist", body: "iPhone 13 screen replacement, certified parts." },
  { title: "Hire a fitness coach for corporate wellness", body: "Group sessions, 8 employees, twice a month." },
  { title: "Need a JavaScript developer (contract)", body: "TanStack Router + Tailwind, two-week scope." },
];

export function needRequestPlan(count = 30) {
  const out = [];
  const providers = lagosProviderPlan(50);
  for (let i = 0; i < count; i++) {
    const tpl = NEED_TEMPLATES[i % NEED_TEMPLATES.length];
    const author = providers[(i * 9 + 13) % providers.length];
    const area = LAGOS_AREAS[i % LAGOS_AREAS.length];
    out.push({
      idHint: `seed_need_${String(i + 1).padStart(3, "0")}`,
      authorId: author.id,
      title: tpl.title,
      description: tpl.body,
      kind: "need",
      scope: "city",
      scopeCountry: "Nigeria",
      scopeState: "Lagos",
      scopeCity: area,
      status: "approved",
    });
  }
  return out;
}

export async function seedNeedRequests({ count = 30 } = {}) {
  const plan = needRequestPlan(count);
  let inserted = 0;
  let skipped = 0;
  for (const n of plan) {
    // We can't put a uuid hint into posts (id is uuid pk default gen_random_uuid).
    // Use (author_id, title) as the natural key for idempotency.
    const existing = await selectOne(
      "posts",
      `author_id=eq.${encodeURIComponent(n.authorId)}&title=eq.${encodeURIComponent(n.title)}&select=id`,
    );
    if (existing) { skipped++; continue; }
    await insertRow(
      "posts",
      {
        author_id: n.authorId,
        kind: n.kind,
        status: n.status,
        title: n.title,
        description: n.description,
        scope: n.scope,
        scope_country: n.scopeCountry,
        scope_state: n.scopeState,
        scope_city: n.scopeCity,
        links: [],
        payload: { seed: true },
        moderated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    );
    inserted++;
  }
  return { count: plan.length, inserted, skipped };
}

// ---------------------------------------------------------------------------
// Help & Guide article seed (10 articles, markdown bodies)
// ---------------------------------------------------------------------------

const HELP_ARTICLES = [
  {
    slug: "welcome-to-needool",
    title: "Welcome to Needool",
    category: "Getting Started",
    tags: ["overview", "intro"],
    body: `# Welcome to Needool

Needool is a Lagos-first marketplace that helps people find skilled providers,
post Need Requests, share Opportunities, hire verified talent, and earn through
referrals.

## How it works

- **Free to browse.** Anyone can read public profiles, Need Requests, Opportunities and Events.
- **Subscribers post and apply.** A small monthly or yearly subscription unlocks posting, applying, and reviewing.
- **Hire requests run through Needool.** We curate the role, screen applicants, and only mark Verified Hires after both sides confirm.

Need help? Use the search box above to look up a topic, or browse the categories on the left.`,
  },
  {
    slug: "choosing-your-subscription-plan",
    title: "Choosing your subscription plan",
    category: "Subscriptions",
    tags: ["billing", "pricing"],
    body: `# Choosing your subscription plan

Needool offers two account types, each with monthly and yearly pricing:

| Account | Monthly | Yearly |
| --- | --- | --- |
| Individual | $2 | $20 |
| Business | $5 | $50 |

Yearly subscriptions save you roughly two months. Plans are billed via NOWPayments
(USDT or card). The 7-free-day referral trial applies if you signed up through a
referral link.

You can switch plans at any time — switches take effect at your next renewal.`,
  },
  {
    slug: "creating-a-need-request",
    title: "Creating a Need Request",
    category: "Posting",
    tags: ["needs", "posting", "rules"],
    body: `# Creating a Need Request

A Need Request is a public ask for help — services, goods, advice, or labour.

## Rules

- **Title:** clear, specific, under 120 characters.
- **Description:** under 2,000 characters.
- **Thumbnail:** required — pick a clear photo that describes the need.
- **Links:** up to 3.
- **No phone numbers or emails** in the title or description — Needool keeps
  contact off-platform until both sides opt in.

Once you submit, your request enters the moderation queue. Admins review every
post against the community rules before publishing.`,
  },
  {
    slug: "opportunities-vs-need-requests",
    title: "Opportunities vs Need Requests",
    category: "Posting",
    tags: ["opportunities", "needs"],
    body: `# Opportunities vs Need Requests

Both surfaces let you reach the marketplace, but they're built for different intents.

| | Need Request | Opportunity |
| --- | --- | --- |
| Who reads it | Service providers | Subscribers |
| Visitor visibility | Title + thumbnail + 150-char summary | Title + thumbnail only |
| Scope picker | Worldwide / Country / State / City / Near-me | Worldwide / Country / State / City |
| Engagement | Comments + likes | Likes only |

Opportunities suit founders sharing roles, partnerships, or paid gigs. Need
Requests suit anyone asking the marketplace for help.`,
  },
  {
    slug: "how-search-works",
    title: "How search works",
    category: "Discovery",
    tags: ["search", "ranking"],
    body: `# How search works

Search runs across providers, posts, opportunities, jobs, and events.

## Ranking

1. **Active accounts first.** Inactive providers fall to the bottom of every page.
2. **Geo proximity.** When you pick a country, state, or city, matching results bubble up.
3. **Recency.** Newer matches outrank older ones in tie-breaks.

## Tips

- Use the scope picker to limit by location.
- Combine free text with skill names ("react developer in Lekki").
- "Near me" uses your last saved location. You can update it from your profile.`,
  },
  {
    slug: "referrals-and-earnings",
    title: "Referrals and earnings",
    category: "Referrals",
    tags: ["referrals", "wallet", "withdrawals"],
    body: `# Referrals and earnings

Every Needool member gets a unique referral code. Share it with friends to earn:

- **10% commission** on every subscription your referrals pay, while you stay active.
- **2% commission** while you are inactive, retroactively bumped to 10% if you reactivate.

## Withdrawals

- Minimum withdrawal: **20 USDT (TRC20)**.
- TOTP 2FA required at withdrawal time.
- Admins approve and paste the tx hash before funds move.

Your wallet balance updates automatically as referrals renew.`,
  },
  {
    slug: "verified-hires-and-reviews",
    title: "Verified hires and reviews",
    category: "Reviews",
    tags: ["reviews", "trigger-a", "hires"],
    body: `# Verified hires and reviews

When a Needool admin marks a job application **Hired**, both parties unlock a
Trigger-A review window:

- **7-day cooldown.** Reviews open 7 days after the hire is marked.
- **180-day window.** After that, the review form closes.
- **Edit window.** Reviews can be edited for 14 days, then they lock.
- **Evidence required for 1–2 stars.** Either a screenshot, document, or link.

Reviews surface on the reviewed party's public profile and contribute to their
aggregate rating.`,
  },
  {
    slug: "trust-and-safety",
    title: "Trust and safety",
    category: "Policies",
    tags: ["policies", "safety", "moderation"],
    body: `# Trust and safety

Needool runs a moderation team that reviews every Need Request and Opportunity
before it goes public. We also operate a Trigger-B review queue with anti-abuse
controls:

- Five reviews per rolling 30 days.
- No reviewing within one referral hop.
- 1- or 2-star reviews are held for admin review before publishing.
- Target users can request a review of a review.

If you spot something off, hit the "Report" button on any review or post.`,
  },
  {
    slug: "frequency-limits-and-account-rules",
    title: "Frequency limits and account rules",
    category: "Policies",
    tags: ["limits", "rules"],
    body: `# Frequency limits and account rules

To keep the marketplace healthy, Needool enforces a few limits:

- **Posts per month:** Individuals 4, Businesses 10.
- **Skills/products/services per account:** Individuals 10, Businesses 20.
- **30-day cool-down** on profile field edits (name, sex, DOB, country).
- **365-day removal lock** once you add a skill — it can be hidden but not deleted.

These keep search rankings honest and prevent spam.`,
  },
  {
    slug: "getting-help-and-contacting-support",
    title: "Getting help and contacting support",
    category: "Getting Started",
    tags: ["support", "contact"],
    body: `# Getting help and contacting support

If you're stuck, try this list in order:

1. **Search the Help center** for your topic.
2. **Check the notifications** in your dashboard — many issues come with an in-app message.
3. **Email support** at hello@needool.local.

Admins triage every email within one business day.`,
  },
];

export function helpArticlePlan() {
  return HELP_ARTICLES.slice();
}

export async function seedHelpArticles() {
  let inserted = 0;
  let updated = 0;
  for (const a of HELP_ARTICLES) {
    const existing = await findArticleBySlug(a.slug);
    if (existing) {
      await updateArticle({
        id: existing.id,
        input: {
          title: a.title,
          body: a.body,
          slug: a.slug,
          category: a.category,
          tags: a.tags,
          status: "published",
        },
      });
      updated++;
    } else {
      await createArticle({
        input: {
          title: a.title,
          body: a.body,
          slug: a.slug,
          category: a.category,
          tags: a.tags,
          status: "published",
        },
        authorId: null,
      });
      inserted++;
    }
  }
  return { count: HELP_ARTICLES.length, inserted, updated };
}

// ---------------------------------------------------------------------------
// Aggregate entry point used by the dev endpoint and the QA matrix.
// ---------------------------------------------------------------------------

export async function seedAll({
  providers = 50,
  needs = 30,
} = {}) {
  const lagos = await seedLagosProviders({ count: providers });
  const needRequests = await seedNeedRequests({ count: needs });
  const help = await seedHelpArticles();
  return {
    providers: lagos,
    needs: needRequests,
    help,
  };
}
