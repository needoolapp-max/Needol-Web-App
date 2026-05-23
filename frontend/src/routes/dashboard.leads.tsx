import { createFileRoute } from "@tanstack/react-router";
import { BusinessLeadsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/leads")({
  head: () => ({ meta: [{ title: "Business Leads - Needool Dashboard" }] }),
  component: BusinessLeadsPage,
});
