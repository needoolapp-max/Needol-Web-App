import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getDashboardDebugSnapshot } from "@/lib/dashboard-debug";

export const Route = createFileRoute("/diag")({
  head: () => ({ meta: [{ title: "Diagnostics - Needool" }] }),
  component: DiagPage,
});

type LongTask = { at: string; duration: number; name: string };
type Viewport = { width: number; height: number; dpr: number };

function getViewport(): Viewport | null {
  if (typeof window === "undefined") return null;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
  };
}

function DiagPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { sessionId } = useClerkAuth();
  const [ua, setUa] = useState("");
  const [route, setRoute] = useState("");
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const [longTasks, setLongTasks] = useState<LongTask[]>([]);
  const [copied, setCopied] = useState(false);
  const [observerActive, setObserverActive] = useState(false);

  const clerkState = useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      userId: user?.id ?? null,
      hasSessionId: Boolean(sessionId),
    }),
    [isLoaded, isSignedIn, sessionId, user?.id],
  );

  useEffect(() => {
    setUa(navigator.userAgent);
    setRoute(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    setViewport(getViewport());
    setSnapshot(getDashboardDebugSnapshot());

    const onResize = () => setViewport(getViewport());
    window.addEventListener("resize", onResize);

    if (typeof PerformanceObserver === "undefined") {
      return () => window.removeEventListener("resize", onResize);
    }

    // Capture is bounded and mounted only on /diag, so it cannot create the
    // feedback loop that previously made auth pages freeze.
    const MAX = 20;
    let captured = 0;
    const observer = new PerformanceObserver((list) => {
      if (captured >= MAX) {
        observer.disconnect();
        return;
      }
      const room = MAX - captured;
      const entries = list.getEntries().slice(0, room);
      captured += entries.length;
      const next: LongTask[] = entries.map((entry) => ({
        at: new Date().toISOString(),
        duration: Math.round(entry.duration),
        name: entry.name || "unknown",
      }));
      setLongTasks((prev) => [...prev, ...next].slice(-MAX));
      if (captured >= MAX) {
        observer.disconnect();
        setObserverActive(false);
      }
    });

    try {
      observer.observe({ type: "longtask", buffered: true });
      setObserverActive(true);
    } catch {
      setObserverActive(false);
    }

    const stop = window.setTimeout(() => {
      observer.disconnect();
      setObserverActive(false);
    }, 30_000);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(stop);
      observer.disconnect();
    };
  }, []);

  const report = useMemo(
    () => ({
      capturedAt: new Date().toISOString(),
      route,
      url: typeof window !== "undefined" ? window.location.href : "",
      clerk: clerkState,
      userAgent: ua,
      viewport,
      longTasks,
      snapshot,
    }),
    [clerkState, longTasks, route, snapshot, ua, viewport],
  );

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm">
      <h1 className="text-2xl font-bold text-foreground">Diagnostics</h1>
      <p className="mt-2 text-muted-foreground">
        Captures the current browser, Clerk, route, viewport, and recent app debug events.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={copyReport}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
        <span className="text-xs text-muted-foreground">
          {observerActive
            ? `Watching for long tasks (${longTasks.length}/20)...`
            : longTasks.length > 0
              ? `Captured ${longTasks.length} long task(s).`
              : "Long-task observer not active."}
        </span>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold text-foreground">Route and viewport</h2>
        <pre className="mt-2 rounded-xl border border-border bg-secondary p-3 text-xs whitespace-pre-wrap">
          {JSON.stringify({ route, viewport }, null, 2)}
        </pre>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-foreground">Clerk state</h2>
        <pre className="mt-2 rounded-xl border border-border bg-secondary p-3 text-xs whitespace-pre-wrap">
          {JSON.stringify(clerkState, null, 2)}
        </pre>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-foreground">User agent</h2>
        <pre className="mt-2 rounded-xl border border-border bg-secondary p-3 text-xs whitespace-pre-wrap break-all">
          {ua}
        </pre>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-foreground">Long tasks</h2>
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-secondary p-3 text-xs">
          {longTasks.length === 0
            ? "(none yet - open /login in another tab, type, then come back)"
            : JSON.stringify(longTasks, null, 2)}
        </pre>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-foreground">App snapshot</h2>
        <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-border bg-secondary p-3 text-xs">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </section>
    </div>
  );
}
