import { createFileRoute } from "@tanstack/react-router";
import { AccountHelpPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/help")({
  head: () => ({ meta: [{ title: "Help - Needool Dashboard" }] }),
  component: AccountHelpPage,
});
