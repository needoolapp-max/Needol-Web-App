import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboardDebugSnapshot } from "@/lib/dashboard-debug";

export const Route = createFileRoute("/diag")({
  head: () => ({ meta: [{ title: "Diagnostics — Needool" }] }),
  component: DiagPage,
});

type LongTask = { at: string; duration: number; name: string };

function DiagPage() {
  const [ua, setUa] = useState("");
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const [longTasks, setLongTasks] = useState<LongTask[]>([]);
  const [copied, setCopied] = useState(false);
  const [observerActive, setObserverActive] = useState(false);

  useEffect(() => {
    setUa(navigator.userAgent);
    setSnapshot(getDashboardDebugSnapshot());

    if (typeof PerformanceObserver === "undefined") return;
    // Hard cap on captures + auto-disconnect after 30s. This MUST NOT be the
    // unbounded PerformanceObserver that originally froze the app — capture
    // is bounded by `captured >= MAX` and a 30s timeout, and it only ever
    // mounts on this one route.
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
      const next: LongTask[] = entries.map((e) => ({
        at: new Date().toISOString(),
        duration: Math.round(e.duration),
        name: e.name,
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
      // Some browsers (older Safari) don't support `longtask`.
      setObserverActive(false);
    }

    const stop = setTimeout(() => {
      observer.disconnect();
      setObserverActive(false);
    }, 30_000);

    return () => {
      clearTimeout(stop);
      observer.disconnect();
    };
  }, []);

  async function copyReport() {
    const report = JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent: ua,
        viewport:
          typeof window !== "undefined"
            ? { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio }
            : null,
        longTasks,
        snapshot,
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm">
      <h1 className="text-2xl font-bold text-foreground">Diagnostics</h1>
      <p className="mt-2 text-muted-foreground">
        Captures environment + recent events to share when troubleshooting.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={copyReport}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
        <span className="text-xs text-muted-foreground">
          {observerActive
            ? `Watching for long tasks (${longTasks.length}/20)…`
            : longTasks.length > 0
              ? `Captured ${longTasks.length} long task(s).`
              : "Long-task observer not active."}
        </span>
      </div>

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
            ? "(none yet — open /login in another tab, type, then come back)"
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
