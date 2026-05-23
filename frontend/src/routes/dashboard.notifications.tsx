import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications - Needool Dashboard" }] }),
  component: NotificationsPage,
});
