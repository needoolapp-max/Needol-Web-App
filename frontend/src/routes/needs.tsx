import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/needs")({
  component: () => <Outlet />,
});
