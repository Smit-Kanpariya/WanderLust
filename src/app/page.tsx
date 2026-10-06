import { Benefits } from "@/components/landing/benefits";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Calculator } from "@/components/calculator/calculator";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <section
          id="calculator"
          aria-labelledby="calculator-heading"
          className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-20 sm:px-6"
        >
          <Calculator />
        </section>
        <HowItWorks />
        <Benefits />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
