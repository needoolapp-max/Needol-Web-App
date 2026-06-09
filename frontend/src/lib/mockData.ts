export type AccountType = "Individual" | "Business" | "NGO";
export type ProviderStatus = "active" | "inactive";

export interface Provider {
  id: string;
  username: string;
  name: string;
  avatar: string;
  accountType: AccountType;
  status: ProviderStatus;
  country: string;
  state: string;
  city: string;
  distanceKm: number;
  skills: string[];
  products?: string[];
  services?: string[];
  hourlyRate: number;
  currency: string;
  workHours: string;
  remote: boolean;
  bio: string;
  links: { label: string; url: string }[];
  cvUrl: string;
  followers: number;
  following: number;
  verified: boolean;
}

export interface NeedRequest {
  id: string;
  title: string;
  poster: string;
  location: string;
  budget: string;
  postedAgo: string;
  tags: string[];
}

export interface Review {
  id: string;
  providerId: string;
  reviewer: string;
  reviewerAvatar: string;
  rating: number;
  body: string;
  tag: "Verified Hire" | "Member";
  date: string;
}

export interface Country { code: string; name: string }

export const countries: Country[] = [
  { code: "WW", name: "Worldwide" },
  { code: "NG", name: "Nigeria" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "GH", name: "Ghana" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "CA", name: "Canada" },
];

const avatar = (seed: string) => `https://i.pravatar.cc/200?u=${seed}`;

export const providers: Provider[] = [
  {
    id: "p1", username: "ada.codes", name: "Ada Okafor", avatar: avatar("ada"),
    accountType: "Individual", status: "active",
    country: "Nigeria", state: "Lagos", city: "Ikeja",
    distanceKm: 3.2,
    skills: ["React", "TypeScript", "Node.js", "UI Design"],
    services: ["Web app development", "Code reviews"],
    hourlyRate: 35, currency: "USD", workHours: "Mon-Fri, 9am-6pm WAT", remote: true,
    bio: "Senior frontend engineer with 7 years building product UIs for fintech and health startups across Africa and Europe.",
    links: [{ label: "Portfolio", url: "https://example.com" }, { label: "GitHub", url: "https://github.com" }],
    cvUrl: "#", followers: 1248, following: 312, verified: true,
  },
  {
    id: "user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn", username: "needoolclerktest", name: "Test User", avatar: avatar("needoolclerktest"),
    accountType: "Individual", status: "active",
    country: "Nigeria", state: "Lagos", city: "Lagos",
    distanceKm: 4.8,
    skills: ["React", "TypeScript", "Frontend Engineering", "Code Reviews"],
    services: ["Frontend development", "UI implementation"],
    hourlyRate: 35, currency: "USD", workHours: "Mon-Fri, 9am-6pm WAT", remote: true,
    bio: "Verified Needool test applicant used for end-to-end hiring and review verification.",
    links: [{ label: "Portfolio", url: "https://example.com" }],
    cvUrl: "#", followers: 18, following: 6, verified: true,
  },
  {
    id: "p2", username: "kemi.designs", name: "Kemi Adebayo", avatar: avatar("kemi"),
    accountType: "Individual", status: "active",
    country: "Nigeria", state: "Lagos", city: "Lekki",
    distanceKm: 8.7,
    skills: ["Brand Design", "Figma", "Illustration"],
    services: ["Logo & identity", "Marketing assets"],
    hourlyRate: 28, currency: "USD", workHours: "Tue-Sat, 10am-7pm", remote: true,
    bio: "Brand designer crafting identities for ambitious founders. Featured in Brand New and It's Nice That.",
    links: [{ label: "Dribbble", url: "https://dribbble.com" }],
    cvUrl: "#", followers: 3402, following: 188, verified: true,
  },
  {
    id: "p3", username: "tunde.fixes", name: "Tunde Bello", avatar: avatar("tunde"),
    accountType: "Individual", status: "active",
    country: "Nigeria", state: "Lagos", city: "Yaba",
    distanceKm: 5.1,
    skills: ["Plumbing", "Electrical", "Home Repair"],
    services: ["Emergency callouts", "Installations"],
    hourlyRate: 12, currency: "USD", workHours: "Daily, 8am-8pm", remote: false,
    bio: "Trusted handyman serving Lagos mainland for 12 years. Same-day service available.",
    links: [], cvUrl: "#", followers: 87, following: 12, verified: false,
  },
  {
    id: "p4", username: "brightpath", name: "BrightPath Studio", avatar: avatar("brightpath"),
    accountType: "Business", status: "active",
    country: "Kenya", state: "Nairobi", city: "Westlands",
    distanceKm: 412,
    skills: ["Video Production", "Motion Graphics", "Editing"],
    services: ["Brand films", "Social cuts"],
    hourlyRate: 80, currency: "USD", workHours: "Mon-Fri, 9am-6pm EAT", remote: true,
    bio: "Award-winning video studio producing brand films across East Africa.",
    links: [{ label: "Reel", url: "https://vimeo.com" }],
    cvUrl: "#", followers: 5621, following: 90, verified: true,
  },
  {
    id: "p5", username: "linahealth", name: "Lina Health NGO", avatar: avatar("lina"),
    accountType: "NGO", status: "active",
    country: "Ghana", state: "Greater Accra", city: "Accra",
    distanceKm: 720,
    skills: ["Community Health", "Outreach", "Training"],
    services: ["Health workshops", "Volunteer placements"],
    hourlyRate: 0, currency: "USD", workHours: "Mon–Fri", remote: false,
    bio: "Non-profit improving maternal and child health outcomes in West Africa.",
    links: [{ label: "Website", url: "https://example.org" }],
    cvUrl: "#", followers: 980, following: 45, verified: true,
  },
  {
    id: "p6", username: "marcus.dev", name: "Marcus Reilly", avatar: avatar("marcus"),
    accountType: "Individual", status: "inactive",
    country: "United States", state: "California", city: "Oakland",
    distanceKm: 12480,
    skills: ["Go", "Distributed Systems", "Kubernetes"],
    services: ["Backend architecture"],
    hourlyRate: 120, currency: "USD", workHours: "Flexible", remote: true,
    bio: "Backend engineer who has scaled platforms to billions of requests.",
    links: [{ label: "Site", url: "https://example.com" }],
    cvUrl: "#", followers: 2102, following: 80, verified: true,
  },
  {
    id: "p7", username: "sara.writes", name: "Sara Vance", avatar: avatar("sara"),
    accountType: "Individual", status: "inactive",
    country: "United Kingdom", state: "England", city: "London",
    distanceKm: 5020,
    skills: ["Copywriting", "Editing", "Content Strategy"],
    services: ["Landing pages", "Brand voice"],
    hourlyRate: 75, currency: "GBP", workHours: "Mon–Thu", remote: true,
    bio: "Copywriter for B2B SaaS. Ex-Stripe.",
    links: [], cvUrl: "#", followers: 612, following: 140, verified: false,
  },
  {
    id: "p8", username: "fixit.lagos", name: "FixIt Lagos", avatar: avatar("fixit"),
    accountType: "Business", status: "active",
    country: "Nigeria", state: "Lagos", city: "Surulere",
    distanceKm: 7.4,
    skills: ["Appliance Repair", "AC Service", "Refrigeration"],
    services: ["On-site repair", "Maintenance contracts"],
    hourlyRate: 18, currency: "USD", workHours: "Daily", remote: false,
    bio: "Lagos' most-booked appliance repair team. 4,000+ jobs completed.",
    links: [], cvUrl: "#", followers: 1820, following: 30, verified: true,
  },
  {
    id: "p9", username: "priya.data", name: "Priya Nair", avatar: avatar("priya"),
    accountType: "Individual", status: "active",
    country: "India", state: "Karnataka", city: "Bengaluru",
    distanceKm: 9800,
    skills: ["Data Science", "Python", "ML"],
    services: ["Model development", "Analytics"],
    hourlyRate: 45, currency: "USD", workHours: "Mon–Fri", remote: true,
    bio: "Data scientist building ML systems for ecommerce and health.",
    links: [{ label: "Kaggle", url: "https://kaggle.com" }],
    cvUrl: "#", followers: 980, following: 220, verified: true,
  },
  {
    id: "p10", username: "studio.noir", name: "Studio Noir", avatar: avatar("noir"),
    accountType: "Business", status: "inactive",
    country: "Germany", state: "Berlin", city: "Mitte",
    distanceKm: 4900,
    skills: ["Architecture", "Interior Design", "3D Render"],
    services: ["Residential design", "Render packs"],
    hourlyRate: 95, currency: "EUR", workHours: "Mon–Fri", remote: false,
    bio: "Boutique architecture studio specialising in residential.",
    links: [], cvUrl: "#", followers: 4400, following: 120, verified: true,
  },
  {
    id: "p11", username: "chioma.cooks", name: "Chioma's Kitchen", avatar: avatar("chioma"),
    accountType: "Business", status: "active",
    country: "Nigeria", state: "Lagos", city: "Victoria Island",
    distanceKm: 11.2,
    skills: ["Catering", "Event Food", "Meal Prep"],
    services: ["Private chef", "Events"],
    hourlyRate: 22, currency: "USD", workHours: "Daily", remote: false,
    bio: "Private chef and event caterer. Pan-African and contemporary menus.",
    links: [], cvUrl: "#", followers: 760, following: 50, verified: false,
  },
  {
    id: "p12", username: "leo.tutors", name: "Leo Mensah", avatar: avatar("leo"),
    accountType: "Individual", status: "inactive",
    country: "Ghana", state: "Greater Accra", city: "Accra",
    distanceKm: 715,
    skills: ["Math Tutoring", "Physics", "SAT Prep"],
    services: ["1:1 tutoring"],
    hourlyRate: 20, currency: "USD", workHours: "Evenings", remote: true,
    bio: "Math & physics tutor. Students placed at top US/UK universities.",
    links: [], cvUrl: "#", followers: 210, following: 80, verified: false,
  },
];

export const needs: NeedRequest[] = [
  { id: "n1", title: "Need a React dev for a 2-week dashboard build", poster: "Ada O.", location: "Remote, Lagos", budget: "$1,500 - $2,500", postedAgo: "2h", tags: ["React", "Remote"] },
  { id: "n2", title: "Wedding photographer for Dec event in Abuja", poster: "Mariam K.", location: "Abuja, NG", budget: "$800", postedAgo: "5h", tags: ["Photography"] },
  { id: "n3", title: "Plumber needed today for a burst pipe in Lekki", poster: "Tobi A.", location: "Lekki, Lagos", budget: "Negotiable", postedAgo: "30m", tags: ["Urgent", "Plumbing"] },
  { id: "n4", title: "Looking for a brand designer for new fintech", poster: "PayLink", location: "Remote", budget: "$3,000", postedAgo: "1d", tags: ["Branding", "Fintech"] },
  { id: "n5", title: "Caterer for 80-guest corporate event", poster: "Brightline Ltd", location: "Nairobi, KE", budget: "$1,200", postedAgo: "8h", tags: ["Catering"] },
  { id: "n6", title: "AC servicing for 6-flat compound", poster: "Mr. Eze", location: "Surulere, Lagos", budget: "$200", postedAgo: "3h", tags: ["AC Repair"] },
];

export const reviews: Review[] = [
  { id: "r1", providerId: "p1", reviewer: "James O.", reviewerAvatar: avatar("james"), rating: 5, body: "Delivered our dashboard a week early. Easy to work with and proactive.", tag: "Verified Hire", date: "2 weeks ago" },
  { id: "r2", providerId: "p1", reviewer: "Funke L.", reviewerAvatar: avatar("funke"), rating: 5, body: "Top-tier React engineer. Would absolutely hire again.", tag: "Verified Hire", date: "1 month ago" },
  { id: "r3", providerId: "p1", reviewer: "Dapo M.", reviewerAvatar: avatar("dapo"), rating: 4, body: "Solid work and great communication throughout.", tag: "Member", date: "3 months ago" },
  { id: "r4", providerId: "p2", reviewer: "Ada O.", reviewerAvatar: avatar("ada"), rating: 5, body: "Our brand finally feels like us. Kemi is exceptional.", tag: "Verified Hire", date: "1 week ago" },
  { id: "r5", providerId: "p3", reviewer: "Bola E.", reviewerAvatar: avatar("bola"), rating: 5, body: "Came within the hour and fixed it properly.", tag: "Verified Hire", date: "4 days ago" },
  { id: "r6", providerId: "p4", reviewer: "Lina K.", reviewerAvatar: avatar("linak"), rating: 5, body: "Beautiful brand film, on time and on budget.", tag: "Verified Hire", date: "3 weeks ago" },
];

export const getProvider = (username: string) => providers.find((p) => p.username === username);
export const getProviderReviews = (id: string) => reviews.filter((r) => r.providerId === id);
