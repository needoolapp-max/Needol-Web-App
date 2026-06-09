import { env, isDev } from "./env.mjs";

// Resend HTTP API wrapper. No-op (but logs) when RESEND_API_KEY is missing —
// keeps Phase 3B working in dev without forcing a real provider key.

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    return { sent: false, reason: "no_recipient" };
  }
  if (!isEmailConfigured()) {
    if (isDev()) {
      console.log(`[email:skip] no RESEND_API_KEY — would send to ${to}: ${subject}`);
      // Surface the body in dev so testers (Playwright MCP) can read OTPs
      // and magic-links straight from the backend log without a real
      // Resend key. Trim aggressively so the log line is readable.
      const preview = (text || html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
      if (preview) console.log(`[email:body] ${preview}`);
    }
    return { sent: false, reason: "no_api_key" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "Needool <hello@needool.local>",
        to: Array.isArray(to) ? to : [to],
        subject,
        text: text || undefined,
        html: html || undefined,
      }),
    });
    const responseText = await response.text();
    let parsed = null;
    try { parsed = responseText ? JSON.parse(responseText) : null; } catch {}
    if (!response.ok) {
      return {
        sent: false,
        reason: "provider_error",
        error: parsed?.message || responseText || `HTTP ${response.status}`,
      };
    }
    return {
      sent: true,
      providerId: parsed?.id || null,
      raw: parsed,
    };
  } catch (err) {
    return { sent: false, reason: "network_error", error: err.message };
  }
}
