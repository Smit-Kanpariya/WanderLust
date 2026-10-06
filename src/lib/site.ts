export const SITE = {
  name: "SettleSmart",
  tagline: "Settle expenses. Make fewer transfers.",
  title: "SettleSmart — Split Group Expenses With Fewer Payments",
  description:
    "Calculate the minimum number of transactions needed to settle shared expenses, accurately down to the cent.",
  /** Optional: set NEXT_PUBLIC_GITHUB_URL to show GitHub links. Hidden when empty. */
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "",
};

/** Base path of a static export (e.g. "/WanderLust" on GitHub Pages); empty on Vercel. */
const BASE_PATH = process.env.STATIC_EXPORT_BASE_PATH ?? "";

/** Path for canonical/Open Graph URLs. File-based metadata (icons, OG image) gets the base path from Next. */
export function sitePath(path: string): string {
  if (!BASE_PATH) return path;
  return `${BASE_PATH}${path === "/" ? "/" : `${path}/`}`;
}

/** Origin only: with a base path, Next would otherwise prefix it twice on generated image URLs. */
export function getSiteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return new URL("http://localhost:3000");
}
