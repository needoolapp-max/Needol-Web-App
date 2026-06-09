// PRD §12 push + §15.5 PWA — push subscription validation.
import assert from "node:assert/strict";
import test from "node:test";
import { PushSubError, pickPushSubscription } from "../lib/push-subscriptions.mjs";

test("pickPushSubscription — nested keys (W3C raw shape) accepted", () => {
  const out = pickPushSubscription({
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "BMq...", auth: "ZHV..." },
  });
  assert.equal(out.endpoint, "https://fcm.googleapis.com/fcm/send/abc");
  assert.equal(out.p256dh, "BMq...");
  assert.equal(out.auth, "ZHV...");
});

test("pickPushSubscription — flat keys also accepted", () => {
  const out = pickPushSubscription({
    endpoint: "https://updates.push.services.mozilla.com/wpush/v2/xyz",
    p256dh: "P256",
    auth: "AUTH",
  });
  assert.equal(out.p256dh, "P256");
  assert.equal(out.auth, "AUTH");
});

test("pickPushSubscription — missing endpoint throws 400", () => {
  assert.throws(
    () => pickPushSubscription({ keys: { p256dh: "x", auth: "y" } }),
    (e) => e instanceof PushSubError && e.field === "endpoint",
  );
});

test("pickPushSubscription — non-https endpoint rejected", () => {
  assert.throws(
    () => pickPushSubscription({
      endpoint: "http://insecure",
      keys: { p256dh: "x", auth: "y" },
    }),
    (e) => e instanceof PushSubError && e.field === "endpoint",
  );
});

test("pickPushSubscription — missing p256dh throws 400", () => {
  assert.throws(
    () => pickPushSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/zzz", keys: { auth: "y" } }),
    (e) => e instanceof PushSubError && e.field === "p256dh",
  );
});

test("pickPushSubscription — missing auth throws 400", () => {
  assert.throws(
    () => pickPushSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/zzz", keys: { p256dh: "y" } }),
    (e) => e instanceof PushSubError && e.field === "auth",
  );
});

test("pickPushSubscription — trims whitespace and caps user_agent", () => {
  const out = pickPushSubscription({
    endpoint: "  https://fcm.googleapis.com/fcm/send/zzz  ",
    p256dh: "  P256  ",
    auth: "  AUTH  ",
    user_agent: "x".repeat(800),
  });
  assert.equal(out.endpoint, "https://fcm.googleapis.com/fcm/send/zzz");
  assert.equal(out.p256dh, "P256");
  assert.equal(out.auth, "AUTH");
  assert.equal(out.user_agent.length, 500);
});

test("PushSubError preserves status + field", () => {
  const e = new PushSubError(400, "msg", "f");
  assert.equal(e.status, 400);
  assert.equal(e.field, "f");
});
