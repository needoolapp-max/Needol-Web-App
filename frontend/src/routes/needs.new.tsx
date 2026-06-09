import { createFileRoute } from "@tanstack/react-router";
import { CreatePostForm } from "@/components/common/CreatePostForm";

export const Route = createFileRoute("/needs/new")({
  head: () => ({ meta: [{ title: "New Need Request - Needool" }] }),
  component: () => (
    <CreatePostForm
      kind="need"
      title="Post a Need Request"
      subtitle="Tell the network what you need. An admin will review before it goes live."
    />
  ),
});
