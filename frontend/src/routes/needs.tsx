import { createFileRoute } from "@tanstack/react-router";
import { MvpSectionPage } from "@/components/common/MvpSectionPage";
import { needRequests } from "@/lib/mvpData";

export const Route = createFileRoute("/needs")({
  head: () => ({ meta: [{ title: "Need Requests - Needool" }] }),
  component: () => (
    <MvpSectionPage
      title="Need Requests"
      description="Dummy Need Requests show the MVP flow for user-posted requests, admin approval, comments, limits, locations, and active-member visibility."
      items={needRequests}
      note="In production, Need Requests will be created by active users, filtered for contact leakage, approved by admins, and backed by comments, likes, saves, and close-not-delete status."
    />
  ),
});
