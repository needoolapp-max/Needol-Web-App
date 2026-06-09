import { createFileRoute } from "@tanstack/react-router";
import { PostFeedPage } from "@/components/common/PostFeedPage";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities - Needool" }] }),
  component: () => (
    <PostFeedPage
      kind="opportunity"
      title="Opportunities"
      subtitle="Grants, contests, fellowships, calls for submissions, and partnership opportunities."
      emptyText="No approved Opportunities yet. Sign in to share one."
      createHref="/opportunities/new"
    />
  ),
});
