import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ConverterDetail } from '@/components/catalogue/converter-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConverterPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ConverterDetail converterId={parseInt(id)} />
      </main>
      <Footer />
    </div>
  );
}
