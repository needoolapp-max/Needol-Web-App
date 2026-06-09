import assert from "node:assert/strict";
import test from "node:test";
import { renderNotification, shouldSendEmail } from "../lib/notifications.mjs";

test("engagement notification channels follow the PRD matrix", () => {
  const comment = renderNotification("comment_received");
  assert.deepEqual(comment.channels, ["in_app", "email"]);
  assert.match(comment.title, /comment/i);
  assert.equal(shouldSendEmail(comment.channels), true);

  const reply = renderNotification("reply_received");
  assert.deepEqual(reply.channels, ["in_app"]);
  assert.match(reply.title, /reply/i);

  const like = renderNotification("like_received", { commentId: "c1" });
  assert.deepEqual(like.channels, ["in_app"]);
  assert.match(like.title, /comment/i);

  const follower = renderNotification("new_follower");
  assert.deepEqual(follower.channels, ["in_app"]);
  assert.match(follower.title, /follower/i);
});

test("unknown notification events remain visible as in-app fallbacks", () => {
  assert.deepEqual(renderNotification("future_event"), {
    channels: ["in_app"],
    title: "future_event",
    body: "",
  });
});
