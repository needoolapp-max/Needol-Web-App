// Phase 10-2 — Editorial Trust Ledger Clerk appearance overrides.
// Applied to <SignIn> and <SignUp> on /login and /signup so the embedded
// Clerk widget reads as a native part of the new auth shell: no card
// shadow, hairline border, DM Sans fonts, primary cerulean accent,
// rounded-lg controls.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#0277b4",
    colorText: "#0b1c28",
    colorTextOnPrimaryBackground: "#f0fbff",
    colorBackground: "transparent",
    colorInputBackground: "#ffffff",
    colorInputText: "#0b1c28",
    borderRadius: "0.5rem",
    fontFamily:
      '"DM Sans", "Segoe UI", system-ui, sans-serif',
    fontFamilyButtons:
      '"DM Sans", "Segoe UI", system-ui, sans-serif',
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
    formFieldInput:
      "rounded-lg border border-input bg-background",
    identityPreview: "border border-border rounded-lg",
  },
} as const;
