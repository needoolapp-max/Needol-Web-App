import { createFileRoute } from "@tanstack/react-router";
import { EventsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/events")({
  head: () => ({ meta: [{ title: "Saved Events - Needool Dashboard" }] }),
  component: EventsPage,
});
