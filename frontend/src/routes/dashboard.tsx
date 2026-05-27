import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/nav/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Needool" }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
