import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/landing/hero-section';
import { MetalPricesTicker } from '@/components/landing/metal-prices-ticker';
import { SearchSection } from '@/components/landing/search-section';
import { BrandCarousel } from '@/components/landing/brand-carousel';
import { FeaturesSection } from '@/components/landing/features-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { ConverterAnatomy } from '@/components/landing/converter-anatomy';
import { AiTeaser } from '@/components/landing/ai-teaser';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <MetalPricesTicker />
        <SearchSection />
        <FeaturesSection />
        <ConverterAnatomy />
        <BrandCarousel />
        <AiTeaser />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
