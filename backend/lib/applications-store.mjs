import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";

export async function createApplication({ jobOpeningId, applicantId, snapshot, answers }) {
  return insertRow(
    "job_applications",
    {
      job_opening_id: jobOpeningId,
      applicant_id: applicantId,
      snapshot: snapshot || {},
      answers: answers || [],
      status: "submitted",
    },
    { returning: "representation" },
  );
}

export async function getApplicationById(id) {
  return selectOne(
    "job_applications",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function getApplicationByPair(jobOpeningId, applicantId) {
  return selectOne(
    "job_applications",
    `job_opening_id=eq.${encodeURIComponent(jobOpeningId)}&applicant_id=eq.${encodeURIComponent(applicantId)}&select=*`,
  );
}

export async function listApplicationsForOpening(jobOpeningId) {
  return selectMany(
    "job_applications",
    `job_opening_id=eq.${encodeURIComponent(jobOpeningId)}&select=*&order=score.desc.nullslast,created_at.desc`,
  );
}

export async function listApplicationsForUser(applicantId) {
  return selectMany(
    "job_applications",
    `applicant_id=eq.${encodeURIComponent(applicantId)}&select=*&order=created_at.desc`,
  );
}

export async function updateApplication(id, patch) {
  await updateRows("job_applications", `id=eq.${encodeURIComponent(id)}`, patch);
  return getApplicationById(id);
}
