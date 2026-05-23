import { createFileRoute } from "@tanstack/react-router";
import { ReviewsPage } from "@/components/dashboard/LoggedInAccountPages";

export const Route = createFileRoute("/dashboard/reviews")({
  head: () => ({ meta: [{ title: "Reviews - Needool Dashboard" }] }),
  component: ReviewsPage,
});
