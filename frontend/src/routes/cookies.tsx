import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Legal"
      title="Cookie Policy"
      description="Placeholder cookie policy for the MVP review build."
      sections={[
        { title: "Referral attribution", body: "Production Needool may use a 30-day referral cookie when someone visits with a ?ref=username link. A manually typed referrer at signup overrides the cookie." },
        { title: "Session cookies", body: "Production authentication may use secure cookies to maintain sessions, reduce fraud, and keep users signed in." },
        { title: "Local demo storage", body: "This demo uses local browser storage for convenience, including the draggable dev toggle position and dummy auth state." },
      ]}
    />
  ),
});
