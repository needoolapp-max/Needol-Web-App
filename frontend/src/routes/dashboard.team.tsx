import { createFileRoute } from "@tanstack/react-router";
import { BusinessTeamPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/team")({
  head: () => ({ meta: [{ title: "Business Team - Needool Dashboard" }] }),
  component: BusinessTeamPage,
});
