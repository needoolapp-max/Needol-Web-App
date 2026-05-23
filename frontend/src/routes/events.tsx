import { createFileRoute } from "@tanstack/react-router";
import { MvpSectionPage } from "@/components/common/MvpSectionPage";
import { events } from "@/lib/mvpData";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events - Needool" }] }),
  component: () => (
    <MvpSectionPage
      title="Events"
      description="Admin-posted online and physical events for the v3.0 dummy MVP. Users browse events but cannot create them in this version."
      items={events}
      note="Production Events will support admin-only posting, location scope, open/closed filters, SEO pages, and pinned events per scope."
    />
  ),
});
