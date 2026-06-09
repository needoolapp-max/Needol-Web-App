import { createFileRoute } from "@tanstack/react-router";
import { PostFeedPage } from "@/components/common/PostFeedPage";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events - Needool" }] }),
  component: () => (
    <PostFeedPage
      kind="event"
      title="Events"
      subtitle="Online and physical Needool events. Posted by admins only in v3.0."
      emptyText="No events posted yet."
    />
  ),
});
