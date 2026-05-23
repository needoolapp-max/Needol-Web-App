import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About Us - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Company"
      title="About Needool"
      description="Needool is designed as a global skills directory and marketplace, starting with a Nigeria soft launch and expanding through verified provider density."
      sections={[
        { title: "What we are building", body: "Needool helps people discover skilled individuals, businesses, and organizations by location, availability, skills, services, reviews, and account status." },
        { title: "Why it matters", body: "The MVP focuses on practical discovery: searchable profiles, Need Requests, Opportunities, Events, admin-managed Job Openings, subscriptions, referrals, and trust controls." },
        { title: "Current demo status", body: "This localhost version uses mock data and placeholder integrations so product flows can be inspected before production services and API keys are connected." },
      ]}
    />
  ),
});
