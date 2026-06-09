import { createFileRoute } from "@tanstack/react-router";
import { CreatePostForm } from "@/components/common/CreatePostForm";

export const Route = createFileRoute("/opportunities/new")({
  head: () => ({ meta: [{ title: "Share an Opportunity - Needool" }] }),
  component: () => (
    <CreatePostForm
      kind="opportunity"
      title="Share an Opportunity"
      subtitle="Grant, contest, fellowship, partnership call — share it with the network. Admin will review."
    />
  ),
});
