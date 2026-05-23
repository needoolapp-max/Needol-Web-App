import { createFileRoute } from "@tanstack/react-router";
import { MvpSectionPage } from "@/components/common/MvpSectionPage";
import { helpArticles } from "@/lib/mvpData";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Guide - Needool" }] }),
  component: () => (
    <MvpSectionPage
      title="Help & Guide"
      description="Static FAQ-style articles for the dummy MVP. This stands in for the admin-authored markdown knowledge base."
      items={helpArticles}
      note="Production Help & Guide will be SEO-indexed, searchable, category-based, and edited from the admin panel CMS."
    />
  ),
});
