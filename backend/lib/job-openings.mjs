export const JOB_OPENING_STATUSES = ["draft", "open", "closed"];
export const JOB_EMPLOYMENT_TYPES = ["Remote", "OnSite", "Hybrid"];
export const ELIGIBLE_ACCOUNT_TYPES = ["Individual", "Business", "Both"];

// PRD §8.4 — applicant must be Active, profile_complete, matching account_type,
// location, nationality. Returns { ok, reason }.
export function isUserEligible({ user, opening }) {
  if (!user) return { ok: false, reason: "Sign in to apply." };
  if (user.status === "banned") return { ok: false, reason: "Account is suspended." };
  if (user.status === "restricted") return { ok: false, reason: "Restricted from applying by admin." };
  if (user.status !== "active") return { ok: false, reason: "Activate your subscription to apply." };
  if (!user.profile_complete) return { ok: false, reason: "Complete your profile (100%) before applying." };

  if (opening.eligible_account_type && opening.eligible_account_type !== "Both") {
    if (user.account_type !== opening.eligible_account_type) {
      return { ok: false, reason: `Only ${opening.eligible_account_type} accounts may apply.` };
    }
  }

  const locations = Array.isArray(opening.eligible_locations) ? opening.eligible_locations : [];
  if (locations.length > 0) {
    const userLocation = [user.scope_city, user.scope_state, user.scope_country]
      .filter(Boolean)
      .join(", ");
    const matches = locations.some((loc) =>
      String(loc).toLowerCase().split(/[\s,]+/).every((tok) =>
        userLocation.toLowerCase().includes(tok),
      ),
    );
    if (!matches) return { ok: false, reason: "Your location doesn't match this opening." };
  }

  const nationalities = Array.isArray(opening.eligible_nationalities)
    ? opening.eligible_nationalities
    : [];
  if (nationalities.length > 0 && !nationalities.includes("All")) {
    const userNationality = user.nationality || user.scope_country || "";
    if (!nationalities.includes(userNationality)) {
      return { ok: false, reason: "Your nationality doesn't match this opening." };
    }
  }
  return { ok: true };
}

export function publicJobOpeningShape(row, questions = []) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    employment_type: row.employment_type,
    eligible_account_type: row.eligible_account_type,
    eligible_locations: row.eligible_locations || [],
    eligible_nationalities: row.eligible_nationalities || [],
    description: row.description,
    application_instructions: row.application_instructions,
    status: row.status,
    pinned: row.pinned,
    published_at: row.published_at,
    created_at: row.created_at,
    questions: questions.map((q) => ({
      id: q.id,
      position: q.position,
      prompt: q.prompt,
      description: q.description,
    })),
  };
}
