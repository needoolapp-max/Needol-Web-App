import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This dummy policy explains the intended production privacy posture for the Needool MVP. It is placeholder text for review."
      sections={[
        { title: "Information collected", body: "Production Needool will collect account, profile, location, subscription, referral, post, review, and support information needed to operate the marketplace." },
        { title: "How information is used", body: "Information is used to provide search, account access, subscription status, fraud prevention, moderation, notifications, support, and legal compliance." },
        { title: "Visibility controls", body: "Inactive profiles hide contact details, links, and CV previews. Approximate distance may be shown, but exact GPS coordinates are not intended for public display." },
        { title: "Dummy environment", body: "This local build stores and displays mock data only. No real payment, wallet, email, map, or blockchain data is processed here." },
      ]}
    />
  ),
});
