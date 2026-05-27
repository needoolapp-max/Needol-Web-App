const DEBUG_KEY = "ndl_dashboard_debug";
const MAX_EVENTS = 80;
const LONG_TASK_EVENT_THRESHOLD_MS = 250;
let toolsInstalled = false;

type DebugEvent = {
  at: string;
  event: string;
  details?: Record<string, unknown>;
};

type DebugSnapshot = {
  version: 1;
  events: DebugEvent[];
  lastApiResponse?: Record<string, unknown>;
  lastLongTask?: Record<string, unknown>;
  lastError?: Record<string, unknown>;
};

declare global {
  interface Window {
    needoolDebugExport?: () => DebugSnapshot;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSnapshot(): DebugSnapshot {
  if (!isBrowser()) return { version: 1, events: [] };
  try {
    const raw = window.localStorage.getItem(DEBUG_KEY);
    if (!raw) return { version: 1, events: [] };
    const parsed = JSON.parse(raw) as Partial<DebugSnapshot>;
    return {
      version: 1,
      events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) : [],
      lastApiResponse: parsed.lastApiResponse,
      lastLongTask: parsed.lastLongTask,
      lastError: parsed.lastError,
    };
  } catch {
    return { version: 1, events: [] };
  }
}

function writeSnapshot(next: DebugSnapshot) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DEBUG_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

function updateSnapshot(mutator: (snapshot: DebugSnapshot) => DebugSnapshot) {
  writeSnapshot(mutator(readSnapshot()));
}

function normalizeError(error: unknown): { name?: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 2_000),
    };
  }
  return { message: String(error) };
}

export function recordDashboardEvent(event: string, details?: Record<string, unknown>) {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    events: [
      ...snapshot.events,
      {
        at: new Date().toISOString(),
        event,
        details,
      },
    ].slice(-MAX_EVENTS),
  }));
}

export function recordDashboardApiResponse(details: Record<string, unknown>) {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    lastApiResponse: {
      at: new Date().toISOString(),
      ...details,
    },
  }));
}

export function recordDashboardError(
  event: string,
  error: unknown,
  details?: Record<string, unknown>,
) {
  const normalized = normalizeError(error);
  updateSnapshot((snapshot) => ({
    ...snapshot,
    lastError: {
      at: new Date().toISOString(),
      event,
      ...normalized,
      details,
    },
    events: [
      ...snapshot.events,
      {
        at: new Date().toISOString(),
        event,
        details: {
          ...details,
          errorName: normalized.name,
          errorMessage: normalized.message,
        },
      },
    ].slice(-MAX_EVENTS),
  }));
}

export function getDashboardDebugSnapshot() {
  return readSnapshot();
}

export function installDashboardDebugTools() {
  if (!isBrowser()) return;
  if (toolsInstalled) return;
  toolsInstalled = true;

  window.needoolDebugExport = getDashboardDebugSnapshot;

  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = Math.round(entry.duration);
          updateSnapshot((snapshot) => ({
            ...snapshot,
            lastLongTask: {
              at: new Date().toISOString(),
              name: entry.name,
              duration,
              startTime: Math.round(entry.startTime),
              currentPath: window.location.pathname,
            },
            events:
              duration >= LONG_TASK_EVENT_THRESHOLD_MS
                ? [
                    ...snapshot.events,
                    {
                      at: new Date().toISOString(),
                      event: "performance:long-task",
                      details: {
                        duration,
                        path: window.location.pathname,
                      },
                    },
                  ].slice(-MAX_EVENTS)
                : snapshot.events,
          }));
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch (error) {
      recordDashboardError("performance-observer:install-failed", error);
    }
  }

  window.addEventListener("error", (event) => {
    recordDashboardError("window:error", event.error ?? event.message, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      path: window.location.pathname,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordDashboardError("window:unhandled-rejection", event.reason, {
      path: window.location.pathname,
    });
  });
}
