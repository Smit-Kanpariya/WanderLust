import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How SettleSmart handles your data: calculations stay in your browser.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 2026">
      <p>
        <strong className="text-ink">Your expense calculations stay in your browser.</strong> SettleSmart runs the
        settlement entirely on your device.
      </p>
      <h2>What we collect</h2>
      <p>
        The names and amounts you enter aren&apos;t sent to a server, saved in cookies or local storage, or shared
        with anyone. Refreshing or closing the page clears them. SettleSmart has no accounts and includes no
        analytics or advertising scripts.
      </p>
      <h2>Hosting</h2>
      <p>
        Like any website, the page is delivered by a hosting provider. Its servers may keep standard technical logs
        (such as IP address, browser type and the time of the request) to operate and secure the service. Those
        logs never include what you type into the calculator.
      </p>
      <h2>Copying and sharing</h2>
      <p>
        When you use Copy plan or Share, the plan text goes to your clipboard or your device&apos;s share sheet.
        What happens after that is up to you and the app you share it with.
      </p>
    </LegalPage>
  );
}
