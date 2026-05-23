import { createFileRoute } from "@tanstack/react-router";
import { MvpSectionPage } from "@/components/common/MvpSectionPage";
import { opportunities } from "@/lib/mvpData";

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities - Needool" }] }),
  component: () => (
    <MvpSectionPage
      title="Opportunities"
      description="A separate dummy section for grants, contests, fellowships, calls for submissions, and partnership opportunities."
      items={opportunities}
      note="The real MVP keeps Opportunities separate from Need Requests, removes comments, applies lower posting limits, and hides detail from visitors until sign-in."
    />
  ),
});
