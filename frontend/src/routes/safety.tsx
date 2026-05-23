import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "Safety - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Trust"
      title="Safety and trust"
      description="Needool's MVP trust layer combines account status, locked contact fields, reviews, moderation, and admin audit trails."
      sections={[
        { title: "Provider checks", body: "Profiles include account state, approximate location, reviews, work details, and public disclaimers. Production KYC is intentionally deferred beyond this MVP." },
        { title: "Reviews", body: "Verified Hire reviews and 30-day Active member reviews are displayed with different tags and moderation rules to limit abuse." },
        { title: "Payments and withdrawals", body: "Production payments and withdrawals should be server-verified, idempotent, logged, and protected by TOTP where required." },
        { title: "User responsibility", body: "Users should verify credentials, avoid unsafe meetings, keep records of agreements, and report suspicious behavior." },
      ]}
    />
  ),
});
