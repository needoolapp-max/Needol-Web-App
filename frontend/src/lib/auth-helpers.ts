// Shared helpers for the Clerk-backed login/signup flows.

// Tell password-manager browser extensions (1Password, LastPass, Bitwarden,
// Dashlane, NordPass, and the many AV/security extensions that fork
// Bitwarden's content script) NOT to inject their autofill UI on these
// inputs. The injected content scripts are documented to spin up infinite
// message loops or 90s+ getShadowRoot() walks on iOS/desktop, freezing the
// page on every keystroke. Native browser autofill (Chrome built-in, iOS
// Keychain) is unaffected by these attributes.
export const NO_AUTOFILL_PROPS = {
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

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

// Map of Clerk error codes to friendlier, action-oriented copy. Codes Clerk's
// own longMessage tends to phrase awkwardly ("Password is incorrect.") or in
// developer terms ("form_param_format_invalid"). For anything not listed we
// fall back to Clerk's longMessage/message, which is usually decent.
const FRIENDLY_CLERK_ERRORS: Record<string, string> = {
  form_password_incorrect: "That password isn't right. Try again or reset it.",
  form_identifier_not_found: "We couldn't find an account with that email.",
  form_identifier_exists: "An account with that email already exists. Try signing in instead.",
  form_password_pwned:
    "That password has appeared in a known data breach. Please choose a different one.",
  form_password_length_too_short: "Your password must be at least 8 characters.",
  form_password_validation_failed: "Your password doesn't meet the security requirements.",
  form_param_format_invalid: "Please check the format of what you entered.",
  form_param_nil: "Please fill in all required fields.",
  form_code_incorrect: "That code is incorrect. Check your email and try again.",
  verification_expired: "That code has expired. Please request a new one.",
  verification_failed: "We couldn't verify that code. Please try again.",
  session_exists: "You're already signed in — refreshing now.",
  single_session_mode: "You're already signed in on another tab.",
  too_many_requests: "Too many attempts. Please wait a moment before trying again.",
  rate_limit_exceeded: "Too many attempts. Please wait a moment before trying again.",
  network_error: "Network problem — please check your connection.",
};

// Extracts a human-readable message from a Clerk error (which nests messages
// under `errors[]` with codes), preferring our friendly copy where we have it,
// and falling back for timeouts, generic Errors, and unknowns.
export function clerkMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof TimeoutError) {
    return "This is taking too long — check your connection and try again.";
  }
  if (err && typeof err === "object" && "errors" in err) {
    const e = (err as { errors: Array<{ code?: string; longMessage?: string; message: string }> })
      .errors;
    const first = e[0];
    if (first) {
      const friendly = first.code ? FRIENDLY_CLERK_ERRORS[first.code] : undefined;
      return friendly ?? first.longMessage ?? first.message ?? fallback;
    }
    return fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
