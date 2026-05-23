import { createFileRoute } from "@tanstack/react-router";
import { BusinessAnalyticsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Business Analytics - Needool Dashboard" }] }),
  component: BusinessAnalyticsPage,
});
