import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Support"
      title="Contact Needool"
      description="A standard support surface for the dummy MVP. Production can connect this to email, ticketing, or admin inboxes later."
      sections={[
        { title: "General support", body: "Email hello@needool.com for account, provider, posting, and subscription questions. This address is placeholder text in the dummy build." },
        { title: "Hiring service", body: "Employers can use the Job Openings flow to request a quote for Needool's admin-managed hiring service." },
        { title: "Trust and safety", body: "Reports about suspicious reviews, unsafe providers, or policy violations should route to a dedicated moderation queue in production." },
      ]}
    />
  ),
});
