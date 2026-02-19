import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PricingSection } from '@/components/landing/pricing-section';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-8">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
