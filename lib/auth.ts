const DEFAULT_CEO_EMAILS = [
  "ceo@malgudi.com",
  "yashvardhnrai@gmail.com",
  "yashvardhanrai@gmail.com",
  "harrshvardhanrai@gmail.com",
  "chandrashekharr05@gmail.com",
];

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function getCeoEmails(): string[] {
  const configured = process.env.CEO_EMAILS?.split(",") ?? [];
  return Array.from(
    new Set(
      [...DEFAULT_CEO_EMAILS, ...configured]
        .map(normalizeEmail)
        .filter(Boolean)
    )
  );
}

export function isCeoEmail(email: string | null | undefined): boolean {
  return getCeoEmails().includes(normalizeEmail(email));
}

export function getDisplayNameFromEmail(email: string | null | undefined): string {
  const localPart = normalizeEmail(email).split("@")[0];
  if (!localPart) return "Team";

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
