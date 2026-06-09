export const HIRE_REQUEST_STATUSES = ["new", "quoted", "paid", "promoted", "cancelled"];
export const EMPLOYMENT_TYPES = ["remote", "onsite", "hybrid"];
export const ACCOUNT_TYPE_PREFS = ["Individual", "Business", "Both"];

const QUOTE_VALID_DAYS = 14; // PRD §8.2 — quote auto-cancels after 14 days

export function quoteExpiryDate(now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + QUOTE_VALID_DAYS);
  return d;
}

export class HireRequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function pickHireRequestInput(body = {}) {
  return {
    employer_name: String(body.employer_name || "").trim(),
    employer_website: String(body.employer_website || "").trim() || null,
    contact_name: String(body.contact_name || "").trim() || null,
    contact_email: String(body.contact_email || "").trim().toLowerCase(),
    contact_phone: String(body.contact_phone || "").trim() || null,
    contact_whatsapp: String(body.contact_whatsapp || "").trim() || null,
    role_title: String(body.role_title || "").trim(),
    num_hires: Number(body.num_hires) || 1,
    account_type_pref: ACCOUNT_TYPE_PREFS.includes(body.account_type_pref)
      ? body.account_type_pref
      : "Both",
    employment_type: EMPLOYMENT_TYPES.includes(body.employment_type)
      ? body.employment_type
      : "remote",
    location: String(body.location || "").trim() || null,
    job_description: String(body.job_description || "").trim(),
    qualifications: String(body.qualifications || "").trim() || null,
    salary_usd: body.salary_usd ? Number(body.salary_usd) : null,
    other_benefits: String(body.other_benefits || "").trim() || null,
    notes: String(body.notes || "").trim() || null,
  };
}

export function validateHireRequestInput(input) {
  if (!input.employer_name) throw new HireRequestValidationError("employer_name is required.");
  if (!input.contact_email || !input.contact_email.includes("@")) {
    throw new HireRequestValidationError("contact_email must be a valid email.");
  }
  if (!input.role_title) throw new HireRequestValidationError("role_title is required.");
  if (!input.job_description) throw new HireRequestValidationError("job_description is required.");
  if (input.num_hires < 1) throw new HireRequestValidationError("num_hires must be at least 1.");
}

const ALLOWED_TRANSITIONS = {
  new: ["quoted", "cancelled"],
  quoted: ["paid", "cancelled"],
  paid: ["promoted"],
  promoted: [],
  cancelled: [],
};

export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
