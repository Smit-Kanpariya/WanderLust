import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for SettleSmart.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 2026">
      <p>SettleSmart is a free calculator for working out who should pay whom after shared expenses.</p>
      <h2>What SettleSmart does, and doesn&apos;t, do</h2>
      <p>
        SettleSmart suggests a list of transfers. It doesn&apos;t move, hold or process money, and it doesn&apos;t
        connect to any bank or payment service. Any payment you make is between you and the other person.
      </p>
      <h2>Your responsibility</h2>
      <p>
        The plan is only as accurate as the amounts you enter. Check the plan with your group before anyone pays.
      </p>
      <h2>No warranty</h2>
      <p>
        SettleSmart is provided &quot;as is&quot;, without warranties of any kind. To the extent permitted by law, we
        aren&apos;t liable for losses that come from using it.
      </p>
    </LegalPage>
  );
}
