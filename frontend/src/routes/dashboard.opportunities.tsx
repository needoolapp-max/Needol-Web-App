import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/opportunities")({
  head: () => ({ meta: [{ title: "My Opportunities - Needool Dashboard" }] }),
  component: OpportunitiesPage,
});
