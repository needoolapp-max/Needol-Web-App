import { createFileRoute } from "@tanstack/react-router";
import { JobsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/jobs")({
  head: () => ({ meta: [{ title: "Job Applications - Needool Dashboard" }] }),
  component: JobsPage,
});
