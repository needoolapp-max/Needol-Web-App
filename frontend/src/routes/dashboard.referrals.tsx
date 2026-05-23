import { createFileRoute } from "@tanstack/react-router";
import { ReferralsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/referrals")({
  head: () => ({ meta: [{ title: "Referrals - Needool Dashboard" }] }),
  component: ReferralsPage,
});
