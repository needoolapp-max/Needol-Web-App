import { createFileRoute } from "@tanstack/react-router";
import { NeedsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/needs")({
  head: () => ({ meta: [{ title: "My Needs - Needool Dashboard" }] }),
  component: NeedsPage,
});
