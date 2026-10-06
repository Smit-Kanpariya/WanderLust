export const SITE = {
  name: "SettleSmart",
  tagline: "Settle expenses. Make fewer transfers.",
  title: "SettleSmart — Split Group Expenses With Fewer Payments",
  description:
    "Calculate the minimum number of transactions needed to settle shared expenses, accurately down to the cent.",
  /** Optional: set NEXT_PUBLIC_GITHUB_URL to show GitHub links. Hidden when empty. */
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "",
};

export function getSiteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return new URL("http://localhost:3000");
}
