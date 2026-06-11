import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroSection } from "@/components/home/hero-section";
import { CarouselSection } from "@/components/home/carousel-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { DifferentiatorSection } from "@/components/home/differentiator-section";
import { FeaturesSection } from "@/components/home/features-section";
import { CtaSection } from "@/components/home/cta-section";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <CarouselSection />
        <HowItWorksSection />
        <DifferentiatorSection />
        <FeaturesSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
