import { createFileRoute } from "@tanstack/react-router";
import { StandardPage } from "@/components/common/StandardPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service - Needool" }] }),
  component: () => (
    <StandardPage
      eyebrow="Legal"
      title="Terms of Service"
      description="Placeholder terms for the MVP review build. Final legal terms should be reviewed before production launch."
      sections={[
        { title: "Marketplace role", body: "Needool is intended to help users discover, contact, and evaluate providers. Users remain responsible for due diligence and off-platform decisions." },
        { title: "Accounts and subscriptions", body: "Production access may depend on email verification, account status, subscription state, posting limits, profile completeness, and admin moderation." },
        { title: "Content moderation", body: "Needool may approve, reject, restrict, suspend, close, or remove content and accounts to protect marketplace quality and safety." },
        { title: "No production transactions here", body: "The localhost demo does not create real subscriptions, payouts, hire quotes, wallet balances, or legal obligations." },
      ]}
    />
  ),
});
