import { randomBytes } from "node:crypto";
import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";
import { emitNotification } from "./notifications-store.mjs";

function generateReviewToken() {
  return randomBytes(24).toString("base64url");
}

export async function createVerifiedHire({ application, employerEmail, employerName, openingId, jobTitle }) {
  const row = await insertRow(
    "verified_hires",
    {
      job_application_id: application.id,
      job_opening_id: openingId ?? application.job_opening_id,
      applicant_id: application.applicant_id,
      employer_email: employerEmail,
      employer_name: employerName,
      employer_review_token: generateReviewToken(),
    },
    { returning: "representation" },
  );
  if (application?.applicant_id) {
    await emitNotification({
      userId: application.applicant_id,
      eventType: "hired",
      payload: { employer: employerName, jobTitle, verifiedHireId: row.id },
    });
  }
  return row;
}

export async function getVerifiedHireById(id) {
  return selectOne(
    "verified_hires",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function getVerifiedHireByToken(token) {
  return selectOne(
    "verified_hires",
    `employer_review_token=eq.${encodeURIComponent(token)}&select=*`,
  );
}

export async function listVerifiedHiresForUser(userId) {
  return selectMany(
    "verified_hires",
    `applicant_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
  );
}

export async function expireReviewWindow({ id, mode }) {
  const past = new Date(Date.now() - 60_000).toISOString();
  const patch = mode === "expire"
    ? { review_window_end_at: past }
    : { reviewer_unlock_at: past };
  await updateRows("verified_hires", `id=eq.${encodeURIComponent(id)}`, patch);
  return getVerifiedHireById(id);
}

// PRD §8.6 + §18.2 — employer reviewer-only persistent surface.
// Resolves the magic-link token to its verified_hire + every sibling
// verified_hire sharing the same employer_email (the cluster the employer
// has reasonable access to). Touches last_seen_at + first-time created_at
// on the canonical row.
export async function resolveEmployerAccount({ token }) {
  const primary = await getVerifiedHireByToken(token);
  if (!primary) return null;
  const nowIso = new Date().toISOString();
  const patch = { employer_account_last_seen_at: nowIso };
  if (!primary.employer_account_created_at) {
    patch.employer_account_created_at = nowIso;
  }
  await updateRows(
    "verified_hires",
    `id=eq.${encodeURIComponent(primary.id)}`,
    patch,
  );
  const siblings = primary.employer_email
    ? await selectMany(
        "verified_hires",
        `employer_email=eq.${encodeURIComponent(primary.employer_email)}&select=*&order=created_at.desc`,
      )
    : [primary];
  return {
    primary: { ...primary, ...patch },
    cluster: siblings,
  };
}
