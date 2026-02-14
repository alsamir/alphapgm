import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">About <span className="text-primary">Catalyser</span></h1>
        <div className="space-y-6 text-muted-foreground">
          <p className="text-lg">
            Catalyser is the leading catalytic converter pricing platform, providing real-time
            valuations based on current Platinum, Palladium, and Rhodium market prices.
          </p>
          <p>
            Our database contains over 19,800 catalytic converter parts across 99 automotive brands,
            making it one of the most comprehensive converter pricing resources available.
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">How It Works</h2>
          <p>
            Each catalytic converter contains precious metals — Platinum (Pt), Palladium (Pd), and
            Rhodium (Rh) — in varying quantities. We measure these in grams per kilogram (g/kg) and
            calculate the value based on live market prices, adjusted for recovery rates.
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">Our AI Assistant</h2>
          <p>
            We are the first converter pricing platform to offer an AI-powered assistant.
            Simply ask about any converter in natural language, and our AI will search our database,
            calculate prices, and provide detailed insights instantly.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
