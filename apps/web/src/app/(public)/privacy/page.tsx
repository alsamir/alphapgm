import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy <span className="text-primary">Policy</span></h1>
        <div className="space-y-6 text-muted-foreground text-sm">
          <p>Last updated: February 2026</p>
          <h2 className="text-xl font-bold text-foreground">1. Information We Collect</h2>
          <p>We collect information you provide during registration (email, username, name, phone) and usage data (search queries, page views, IP address).</p>
          <h2 className="text-xl font-bold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to provide the service, process payments, communicate with you, and improve our platform. We do not sell your personal data.</p>
          <h2 className="text-xl font-bold text-foreground">3. Data Security</h2>
          <p>We use industry-standard security measures including encryption, secure password hashing, and regular security audits to protect your data.</p>
          <h2 className="text-xl font-bold text-foreground">4. Cookies</h2>
          <p>We use essential cookies for authentication and optional analytics cookies. You can manage cookie preferences in your browser settings.</p>
          <h2 className="text-xl font-bold text-foreground">5. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@catalyser.com for data requests.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
