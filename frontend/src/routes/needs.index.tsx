import { createFileRoute } from "@tanstack/react-router";
import { PostFeedPage } from "@/components/common/PostFeedPage";

export const Route = createFileRoute("/needs/")({
  head: () => ({ meta: [{ title: "Need Requests - Needool" }] }),
  component: () => (
    <PostFeedPage
      kind="need"
      title="Need Requests"
      subtitle="People and businesses asking the network for help with what they need."
      emptyText="No approved Need Requests yet. Be the first to post."
      createHref="/needs/new"
    />
  ),
});
