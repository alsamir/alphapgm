import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Contact <span className="text-primary">Us</span></h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Have questions? We are here to help. Reach out to us through any of the channels below.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">support@catalyser.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Remote — Worldwide</span>
              </div>
            </div>
          </div>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <input type="text" placeholder="Your Name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <input type="email" placeholder="Your Email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <textarea placeholder="Your Message" rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
                <button type="submit" className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                  Send Message
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
