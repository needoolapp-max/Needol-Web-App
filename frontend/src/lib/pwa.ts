// PRD §15.5 — PWA registration + A2HS prompt handling. Push helpers live
// here too to keep web-platform glue in one place.

const SW_URL = "/sw.js";

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Skip in dev to avoid Vite HMR cache fights — opt in via a flag.
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_SW_IN_DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch((e) => {
      // best-effort; never block app boot
      console.warn("[pwa] sw register failed", e);
    });
  });
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let cachedPromptEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

export function installA2HSListener(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    cachedPromptEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    cachedPromptEvent = null;
    listeners.forEach((cb) => cb(false));
  });
}

export function isA2HSAvailable(): boolean {
  return cachedPromptEvent != null;
}

export function subscribeA2HSAvailability(cb: (available: boolean) => void): () => void {
  listeners.add(cb);
  // Fire current state immediately so React state syncs on mount.
  cb(isA2HSAvailable());
  return () => listeners.delete(cb);
}

export async function promptA2HS(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!cachedPromptEvent) return "unavailable";
  try {
    await cachedPromptEvent.prompt();
    const choice = await cachedPromptEvent.userChoice;
    cachedPromptEvent = null;
    listeners.forEach((cb) => cb(false));
    return choice.outcome;
  } catch {
    return "dismissed";
  }
}

// ---- Web push helpers ---------------------------------------------------

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  return sub;
}

// Convert base64 VAPID key → Uint8Array for pushManager.subscribe.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushSubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "permission-denied" | "no-vapid" | "no-sw" | "unsupported" | "error"; error?: string };

export async function ensurePushSubscription(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const vapid = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || "";
  if (!vapid) return { ok: false, reason: "no-vapid" };
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { ok: false, reason: "no-sw" };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };
  try {
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
    });
    return { ok: true, subscription };
  } catch (err) {
    return { ok: false, reason: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function disablePushSubscription(): Promise<{ ok: boolean; endpoint?: string }> {
  const sub = await getActivePushSubscription();
  if (!sub) return { ok: true };
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
    return { ok: true, endpoint };
  } catch {
    return { ok: false, endpoint };
  }
}
