import { createFileRoute } from "@tanstack/react-router";
import { DashboardHome } from "@/components/dashboard/MemberDashboardPages";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard - Needool" }] }),
  component: DashboardHome,
});
