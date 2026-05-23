import { createFileRoute } from "@tanstack/react-router";
import { BusinessProfilePage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/business-profile")({
  head: () => ({ meta: [{ title: "Business Profile - Needool Dashboard" }] }),
  component: BusinessProfilePage,
});
