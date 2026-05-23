import { createFileRoute } from "@tanstack/react-router";
import { MvpSectionPage } from "@/components/common/MvpSectionPage";
import { jobs } from "@/lib/mvpData";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Job Openings - Needool" }] }),
  component: () => (
    <MvpSectionPage
      title="Job Openings"
      description="Dummy job openings model the paid hiring service: hire request, quote, payment, admin publishing, applicant scoring, and Verified Hire review creation."
      items={jobs}
      note="The real flow will verify employer email, create a quote, use NowPayments checkout, auto-promote paid requests to draft openings, and let admins score applicants."
    />
  ),
});
