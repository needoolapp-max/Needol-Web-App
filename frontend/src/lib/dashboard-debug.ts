const DEBUG_KEY = "ndl_dashboard_debug";
const MAX_EVENTS = 80;
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

// Keep the working snapshot in memory and flush to localStorage at most once
// per second. This keeps the synchronous hot path cheap (no JSON.parse +
// localStorage.setItem on every event) so a burst of errors can never turn
// into a write loop that blocks the main thread.
const FLUSH_INTERVAL_MS = 1_000;
let memory: DebugSnapshot | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getMemory(): DebugSnapshot {
  if (!memory) memory = readSnapshot();
  return memory;
}

function scheduleFlush() {
  if (flushTimer || !isBrowser()) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (memory) writeSnapshot(memory);
  }, FLUSH_INTERVAL_MS);
}

function updateSnapshot(mutator: (snapshot: DebugSnapshot) => DebugSnapshot) {
  memory = mutator(getMemory());
  scheduleFlush();
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
  return getMemory();
}

export function installDashboardDebugTools() {
  if (!isBrowser()) return;
  if (toolsInstalled) return;
  toolsInstalled = true;

  window.needoolDebugExport = getDashboardDebugSnapshot;

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
