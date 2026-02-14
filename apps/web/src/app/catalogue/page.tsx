import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CatalogueContent } from '@/components/catalogue/catalogue-content';
import { Suspense } from 'react';

export default function CataloguePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Converter <span className="text-primary">Catalogue</span></h1>
        <p className="text-muted-foreground mb-8">Search and browse 19,800+ catalytic converters across 99 brands</p>
        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <CatalogueContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
