import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";

export async function createJobOpening(row) {
  return insertRow(
    "job_openings",
    {
      hire_request_id: row.hire_request_id ?? null,
      external_job_opening_id: row.external_job_opening_id ?? null,
      title: row.title,
      eligible_account_type: row.eligible_account_type || "Both",
      eligible_locations: row.eligible_locations ?? [],
      eligible_nationalities: row.eligible_nationalities ?? [],
      employment_type: row.employment_type || "Remote",
      description: row.description ?? null,
      application_instructions: row.application_instructions ?? null,
      status: row.status || "draft",
    },
    { returning: "representation" },
  );
}

export async function getJobOpeningById(id) {
  return selectOne(
    "job_openings",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function listJobOpenings({ status, limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  params.set("order", "pinned.desc,created_at.desc");
  params.set("limit", String(limit));
  return selectMany("job_openings", params.toString());
}

export async function updateJobOpening(id, patch) {
  await updateRows("job_openings", `id=eq.${encodeURIComponent(id)}`, patch);
  return getJobOpeningById(id);
}

export async function publishJobOpening(id) {
  await updateRows("job_openings", `id=eq.${encodeURIComponent(id)}`, {
    status: "open",
    published_at: new Date().toISOString(),
  });
  return getJobOpeningById(id);
}

export async function closeJobOpening(id) {
  await updateRows("job_openings", `id=eq.${encodeURIComponent(id)}`, {
    status: "closed",
    closed_at: new Date().toISOString(),
  });
  return getJobOpeningById(id);
}

// Questions ----------------------------------------------------------------

export async function listQuestions(jobOpeningId) {
  return selectMany(
    "job_opening_questions",
    `job_opening_id=eq.${encodeURIComponent(jobOpeningId)}&select=*&order=position.asc`,
  );
}

export async function replaceQuestions(jobOpeningId, questions) {
  // Simple replace: delete-then-insert pattern via PostgREST.
  const { selectMany: _ } = await import("./supabase.mjs");
  const { env } = await import("./env.mjs");
  const url = `${env.SUPABASE_URL}/rest/v1/job_opening_questions?job_opening_id=eq.${encodeURIComponent(jobOpeningId)}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = (questions || [])
    .filter((q) => q && q.prompt)
    .map((q, idx) => ({
      job_opening_id: jobOpeningId,
      position: idx + 1,
      prompt: String(q.prompt).trim(),
      description: q.description ? String(q.description).trim() : null,
    }));
  if (rows.length === 0) return [];
  await insertRow("job_opening_questions", rows);
  return listQuestions(jobOpeningId);
}
