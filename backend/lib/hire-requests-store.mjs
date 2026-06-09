import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";

export async function createHireRequest(row) {
  return insertRow(
    "hire_requests",
    {
      employer_name: row.employer_name,
      employer_website: row.employer_website,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      contact_whatsapp: row.contact_whatsapp,
      role_title: row.role_title,
      num_hires: row.num_hires,
      account_type_pref: row.account_type_pref,
      employment_type: row.employment_type,
      location: row.location,
      job_description: row.job_description,
      qualifications: row.qualifications,
      salary_usd: row.salary_usd,
      other_benefits: row.other_benefits,
      notes: row.notes,
      email_verified_at: row.email_verified_at ?? null,
      otp_verification_id: row.otp_verification_id ?? null,
    },
    { returning: "representation" },
  );
}

export async function getHireRequestById(id) {
  return selectOne(
    "hire_requests",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function listHireRequests({ status, limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  params.set("order", "created_at.desc");
  params.set("limit", String(limit));
  return selectMany("hire_requests", params.toString());
}

export async function setQuote({ id, amount, paymentId, orderId, sentAt, expiresAt }) {
  await updateRows("hire_requests", `id=eq.${encodeURIComponent(id)}`, {
    status: "quoted",
    quote_amount_usd: amount,
    quote_payment_id: paymentId,
    quote_order_id: orderId,
    quote_sent_at: sentAt,
    quote_expires_at: expiresAt,
  });
  return getHireRequestById(id);
}

export async function markPaid({ id, paidAt }) {
  await updateRows("hire_requests", `id=eq.${encodeURIComponent(id)}`, {
    status: "paid",
    paid_at: paidAt,
  });
  return getHireRequestById(id);
}

export async function promote({ id, jobOpeningId }) {
  await updateRows("hire_requests", `id=eq.${encodeURIComponent(id)}`, {
    status: "promoted",
    promoted_job_opening_id: jobOpeningId,
  });
  return getHireRequestById(id);
}

export async function cancel({ id, reason }) {
  await updateRows("hire_requests", `id=eq.${encodeURIComponent(id)}`, {
    status: "cancelled",
    cancel_reason: reason || null,
    cancelled_at: new Date().toISOString(),
  });
  return getHireRequestById(id);
}
