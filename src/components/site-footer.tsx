import Link from "next/link";
import { LogoMark } from "./logo";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <LogoMark className="size-6" />
            SettleSmart
          </p>
          <p className="mt-1.5 text-sm text-muted">Built for simpler group expenses.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <Link href="/privacy" className="hover:text-ink hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink hover:underline">
            Terms
          </Link>
          {SITE.githubUrl ? (
            <a href={SITE.githubUrl} className="hover:text-ink hover:underline" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
