// Phase 10-2 — Editorial Trust Ledger Clerk appearance overrides.
// Applied to <SignIn> and <SignUp> on /login and /signup so the embedded
// Clerk widget reads as a native part of the new auth shell: no card
// shadow, hairline border, DM Sans fonts, primary cerulean accent,
// rounded-lg controls.
//
// Phase 10-2 (revisit) — Theme-aware. The previous static export
// hardcoded the light-mode token set (colorText #0b1c28), which made
// every Clerk label / input value / footer link render in dark text on
// the dark surface = invisible. Now the appearance object is computed
// from the current ThemeContext mode at render time.

export type ClerkThemeMode = "light" | "dark";

const LIGHT_TOKENS = {
  colorText: "#0b1c28",
  colorTextOnPrimaryBackground: "#f0fbff",
  colorTextSecondary: "#3b5568",
  colorInputBackground: "#ffffff",
  colorInputText: "#0b1c28",
  colorBackground: "#f8fbfd",
  colorNeutral: "#0b1c28",
} as const;

const DARK_TOKENS = {
  colorText: "#e8f8ff",
  colorTextOnPrimaryBackground: "#001923",
  colorTextSecondary: "#7ab0c4",
  colorInputBackground: "#061822",
  colorInputText: "#e8f8ff",
  colorBackground: "#051520",
  colorNeutral: "#e8f8ff",
} as const;

export function getClerkAppearance(mode: ClerkThemeMode) {
  const tokens = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
  return {
    variables: {
      colorPrimary: "#0277b4",
      colorDanger: mode === "dark" ? "#ff5d5d" : "#c63333",
      colorSuccess: mode === "dark" ? "#1bd49f" : "#07946b",
      colorWarning: "#f59e0b",
      ...tokens,
      borderRadius: "0.5rem",
      fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
      fontFamilyButtons: '"DM Sans", "Segoe UI", system-ui, sans-serif',
      fontWeight: { normal: 400, medium: 500, bold: 700 },
    },
    elements: {
      rootBox: "w-full",
      card: "shadow-none border border-border bg-transparent",
      headerTitle:
        "font-heading text-xl font-bold tracking-tight text-foreground",
      headerSubtitle: "text-sm text-muted-foreground",
      socialButtonsBlockButton:
        "border border-border rounded-lg hover:bg-secondary",
      formButtonPrimary:
        "rounded-lg bg-foreground text-background hover:opacity-90 normal-case font-bold",
      footerActionLink:
        "text-foreground font-semibold underline-offset-4 hover:underline",
      formFieldInput: "rounded-lg border border-input",
      identityPreview: "border border-border rounded-lg",
    },
  } as const;
}

/**
 * @deprecated Static (light-mode-only) appearance kept as a legacy
 * export so any third caller still imports something. New consumers
 * should use `getClerkAppearance(mode)` from a component that has
 * access to `useThemeMode()`.
 */
export const clerkAppearance = getClerkAppearance("dark");
