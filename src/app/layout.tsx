import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getSiteUrl, SITE, sitePath } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: SITE.title, template: "%s · SettleSmart" },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: sitePath("/") },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: sitePath("/"),
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#f5f7f8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <a
          href="#calculator"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to calculator
        </a>
        {children}
      </body>
    </html>
  );
}
