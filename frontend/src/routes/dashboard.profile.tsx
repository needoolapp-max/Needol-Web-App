import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile - Needool Dashboard" }] }),
  component: ProfilePage,
});
