// Shared helpers for the Clerk-backed login/signup flows.

export class TimeoutError extends Error {
  constructor() {
    super("The request timed out.");
    this.name = "TimeoutError";
  }
}

// Clerk network calls have no built-in timeout. A hung request leaves the form
// stuck on "Signing in…" with no feedback, which users read as a freeze. Racing
// against a timeout lets us surface an error and re-enable the form instead.
export function withTimeout<T>(promise: Promise<T>, ms = 20_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Extracts a human-readable message from a Clerk error (which nests messages
// under `errors[]`), falling back for timeouts, generic Errors, and unknowns.
export function clerkMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof TimeoutError) {
    return "This is taking too long — check your connection and try again.";
  }
  if (err && typeof err === "object" && "errors" in err) {
    const e = (err as { errors: Array<{ longMessage?: string; message: string }> }).errors;
    return e[0]?.longMessage ?? e[0]?.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
