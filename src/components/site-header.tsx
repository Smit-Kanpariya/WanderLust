import Link from "next/link";
import { LogoMark } from "./logo";
import { SITE } from "@/lib/site";

const navLink =
  "hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white hover:text-ink sm:inline-flex";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg text-[1.05rem] font-semibold tracking-tight">
          <LogoMark />
          SettleSmart
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/#how-it-works" className={navLink}>
            How it works
          </Link>
          <Link href="/#faq" className={navLink}>
            FAQ
          </Link>
          {SITE.githubUrl ? (
            <a href={SITE.githubUrl} className={navLink} rel="noreferrer">
              GitHub
            </a>
          ) : null}
          <Link href="/#calculator" className="btn btn-primary ml-1 h-10 px-4">
            Start settling
          </Link>
        </div>
      </nav>
    </header>
  );
}
