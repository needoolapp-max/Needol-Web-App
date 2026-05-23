import { createFileRoute } from "@tanstack/react-router";
import { BusinessServicesPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/services")({
  head: () => ({ meta: [{ title: "Business Services - Needool Dashboard" }] }),
  component: BusinessServicesPage,
});
