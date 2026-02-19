import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of <span className="text-primary">Service</span></h1>
        <div className="space-y-6 text-muted-foreground text-sm">
          <p>Last updated: February 2026</p>
          <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using Catalyser, you agree to be bound by these Terms of Service.</p>
          <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
          <p>Catalyser provides catalytic converter pricing data based on current precious metal market prices. Pricing is for informational purposes and should not be considered a binding offer.</p>
          <h2 className="text-xl font-bold text-foreground">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration.</p>
          <h2 className="text-xl font-bold text-foreground">4. Prohibited Activities</h2>
          <p>You may not: (a) scrape, crawl, or use automated means to access the service; (b) redistribute pricing data; (c) share account credentials; (d) attempt to circumvent rate limits or access controls.</p>
          <h2 className="text-xl font-bold text-foreground">5. Intellectual Property</h2>
          <p>All data, images, and content on Catalyser are proprietary. Unauthorized reproduction is strictly prohibited and will be pursued under applicable DMCA and copyright laws.</p>
          <h2 className="text-xl font-bold text-foreground">6. Subscriptions and Payments</h2>
          <p>Paid plans are billed monthly via Stripe. You may cancel at any time; access continues until the end of your billing period. Credits do not expire unless you downgrade to a free plan.</p>
          <h2 className="text-xl font-bold text-foreground">7. Limitation of Liability</h2>
          <p>Catalyser provides pricing estimates based on market data and is not liable for any financial decisions made based on this information.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
