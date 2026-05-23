export type MvpItem = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  status: string;
  meta: string[];
  tags: string[];
  cta?: string;
};

export const needRequests: MvpItem[] = [
  {
    id: "need-1",
    title: "Build a React reporting dashboard",
    eyebrow: "Need Request",
    description: "A Lagos fintech team needs a two-week dashboard build with charts, role-based views, and handoff notes.",
    status: "Approved",
    meta: ["Remote", "Budget USD 1,500 - 2,500", "12 comments"],
    tags: ["React", "TypeScript", "Fintech"],
    cta: "View need",
  },
  {
    id: "need-2",
    title: "Emergency plumber for a Lekki apartment",
    eyebrow: "Need Request",
    description: "Same-day repair for a burst kitchen pipe. Contact details unlock for active members in the real build.",
    status: "Pending admin approval",
    meta: ["Lekki, Lagos", "Negotiable", "Urgent"],
    tags: ["Plumbing", "In-person"],
    cta: "Track approval",
  },
  {
    id: "need-3",
    title: "Caterer for an 80-person corporate lunch",
    eyebrow: "Need Request",
    description: "Corporate office lunch with vegetarian options, delivery, and service staff for a half-day event.",
    status: "Approved",
    meta: ["Nairobi, Kenya", "Budget USD 1,200", "Open"],
    tags: ["Catering", "Events"],
    cta: "View need",
  },
];

export const opportunities: MvpItem[] = [
  {
    id: "opp-1",
    title: "Lagos creator micro-grant",
    eyebrow: "Opportunity",
    description: "A seeded grant listing for designers, filmmakers, and writers. No comments in the MVP opportunity flow.",
    status: "Approved",
    meta: ["Nigeria", "Deadline Jun 30, 2026", "Admin reviewed"],
    tags: ["Grant", "Creators"],
    cta: "View opportunity",
  },
  {
    id: "opp-2",
    title: "Remote climate fellowship",
    eyebrow: "Opportunity",
    description: "A worldwide fellowship listing with placeholder links and stricter visitor gating in the real implementation.",
    status: "Pinned",
    meta: ["Worldwide", "Deadline Jul 14, 2026", "No comments"],
    tags: ["Fellowship", "Remote"],
    cta: "View opportunity",
  },
  {
    id: "opp-3",
    title: "SME partnership call",
    eyebrow: "Opportunity",
    description: "A business partnership call for agencies that want to provide verified local services in Abuja.",
    status: "Pending admin approval",
    meta: ["Abuja, Nigeria", "4 links attached", "Business eligible"],
    tags: ["Partnership", "Business"],
    cta: "Track approval",
  },
];

export const events: MvpItem[] = [
  {
    id: "event-1",
    title: "Needool Lagos provider clinic",
    eyebrow: "Admin-posted Event",
    description: "A seeded physical event where providers can improve profiles, learn safety rules, and understand subscriptions.",
    status: "Open",
    meta: ["Yaba, Lagos", "Physical", "Posted by Needool"],
    tags: ["Clinic", "Lagos"],
    cta: "Register interest",
  },
  {
    id: "event-2",
    title: "Winning verified hire profiles",
    eyebrow: "Admin-posted Event",
    description: "An online product education session for active members, with dummy registration and reminder states.",
    status: "Open",
    meta: ["Worldwide", "Online", "Web push placeholder"],
    tags: ["Profiles", "Online"],
    cta: "Register interest",
  },
];

export const jobs: MvpItem[] = [
  {
    id: "job-1",
    title: "Frontend Engineer for a health startup",
    eyebrow: "Job Opening",
    description: "Admin-managed job opening with applicant scoring, custom questions, and Verified Hire review trigger.",
    status: "Open",
    meta: ["Remote", "18 applicants", "Quote paid"],
    tags: ["Individual", "React", "Nigeria eligible"],
    cta: "View opening",
  },
  {
    id: "job-2",
    title: "Operations Associate",
    eyebrow: "Draft Job Opening",
    description: "A dummy draft created after a quote payment. Admin publish is required before applicants can apply.",
    status: "Awaiting admin publish",
    meta: ["Lagos", "0 applicants", "Draft"],
    tags: ["Full-time", "On-site"],
    cta: "Preview draft",
  },
];

export const helpArticles: MvpItem[] = [
  {
    id: "help-1",
    title: "How account states work",
    eyebrow: "Help & Guide",
    description: "Unverified users cannot log in, inactive users can browse with locked contact fields, and active users can post and apply.",
    status: "Published",
    meta: ["Accounts", "3 min read"],
    tags: ["Signup", "Active", "Inactive"],
  },
  {
    id: "help-2",
    title: "How subscription stacking works",
    eyebrow: "Help & Guide",
    description: "The real billing engine preserves referred-user trial days, enforces renewal windows, and blocks expiry beyond 13 months.",
    status: "Published",
    meta: ["Billing", "4 min read"],
    tags: ["NowPayments", "Trial", "Renewal"],
  },
  {
    id: "help-3",
    title: "How reviews stay trustworthy",
    eyebrow: "Help & Guide",
    description: "Verified Hire reviews and 30-day Active member reviews are separated with moderation, evidence rules, and a kill switch.",
    status: "Draft",
    meta: ["Trust", "Admin review"],
    tags: ["Reviews", "Safety"],
  },
];

export const billingPlans = [
  { name: "Individual", monthly: "USD 2 / 2 USDT", yearly: "USD 20 / 20 USDT", limits: "30 skills, 7 links, 4 needs/month, 2 opportunities/month" },
  { name: "Business", monthly: "USD 5 / 5 USDT", yearly: "USD 50 / 50 USDT", limits: "100 skills, 15 links, 8 needs/month, 4 opportunities/month" },
];

export const referralRows = [
  { user: "kemi.designs", status: "Active", rate: "10%", earned: "18.40 USDT" },
  { user: "fixit.lagos", status: "Inactive", rate: "2%", earned: "1.20 USDT" },
  { user: "brightpath", status: "Active", rate: "10%", earned: "32.00 USDT" },
];
