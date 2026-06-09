import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({
  component: () => <Outlet />,
});
