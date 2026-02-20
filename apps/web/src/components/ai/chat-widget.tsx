'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Coins, ExternalLink, Camera, ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ConverterRef {
  id: number;
  name: string;
  brand: string;
  weight?: string;
  imageUrl?: string;
  hasPt: boolean;
  hasPd: boolean;
  hasRh: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  converters?: ConverterRef[];
  imageUrl?: string; // for showing uploaded image in chat
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  en: ['Find BMW converters', 'My credit balance', "Today's metal prices?", 'My price list'],
  ar: ['ابحث عن محولات BMW', 'رصيد الأرصدة', 'أسعار المعادن اليوم؟', 'قائمة الأسعار'],
  fr: ['Trouver des convertisseurs BMW', 'Mon solde de crédits', "Prix des métaux aujourd'hui ?", 'Ma liste de prix'],
  de: ['BMW Katalysatoren finden', 'Mein Guthaben', 'Metallpreise heute?', 'Meine Preisliste'],
  es: ['Buscar convertidores BMW', 'Mi saldo de créditos', '¿Precios de metales hoy?', 'Mi lista de precios'],
  it: ['Trova convertitori BMW', 'Il mio saldo crediti', 'Prezzi dei metalli oggi?', 'La mia lista prezzi'],
  nl: ['Zoek BMW katalysatoren', 'Mijn creditsaldo', 'Metaalprijzen vandaag?', 'Mijn prijslijst'],
  tr: ['BMW katalizör bul', 'Kredi bakiyem', 'Bugünkü metal fiyatları?', 'Fiyat listem'],
};

const INPUT_PLACEHOLDER: Record<string, string> = {
  en: 'Ask about any converter...',
  ar: 'اسأل عن أي محول حفاز...',
  fr: 'Posez une question sur un convertisseur...',
  de: 'Fragen Sie nach einem Katalysator...',
  es: 'Pregunte sobre cualquier convertidor...',
  it: 'Chiedi di qualsiasi convertitore...',
  nl: 'Vraag over een katalysator...',
  tr: 'Herhangi bir katalizör hakkında sorun...',
};

const CDN_BASE = 'https://apg.fra1.cdn.digitaloceanspaces.com';
const PLACEHOLDER = '/converter-placeholder.svg';

function getConverterImageUrl(name: string) {
  const cleanName = name.trim().split(' / ')[0].trim();
  return `${CDN_BASE}/images/${encodeURIComponent(cleanName)}.png`;
}

// Converter card thumbnail — matches catalogue image pattern
function ConverterThumb({ name }: { name: string }) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = PLACEHOLDER;
  };

  return (
    <img
      src={getConverterImageUrl(name)}
      alt={name}
      className="h-10 w-10 rounded object-cover flex-shrink-0 bg-muted"
      onError={handleError}
    />
  );
}

// Inline converter card — no price, links to detail page
function ConverterCardInline({ data, locale }: { data: ConverterRef; locale: string }) {
  const metals = [
    data.hasPt && 'Pt',
    data.hasPd && 'Pd',
    data.hasRh && 'Rh',
  ].filter(Boolean);

  return (
    <Link
      href={`/${locale}/converter/${data.id}`}
      className="flex items-center gap-2.5 p-2 my-1.5 rounded-lg border border-border/60 bg-background/50 hover:bg-secondary/50 transition-colors group"
    >
      <ConverterThumb name={data.name} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{data.name}</div>
        <div className="text-[10px] text-muted-foreground">
          {data.brand}
          {data.weight ? ` · ${data.weight}` : ''}
          {metals.length > 0 ? ` · ${metals.join('/')}` : ''}
        </div>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </Link>
  );
}

export function ChatWidget() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<number | undefined>();
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [aiQueriesRemaining, setAiQueriesRemaining] = useState<number | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const suggestions = SUGGESTED_QUESTIONS[locale] || SUGGESTED_QUESTIONS.en;
  const placeholder = INPUT_PLACEHOLDER[locale] || INPUT_PLACEHOLDER.en;

  const handleSend = async () => {
    if (!input.trim() || !token || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.sendAiMessage(userMessage, chatId, token, locale);
      if (res.data) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: res.data.message,
          converters: res.data.converters || [],
        }]);
        setChatId(res.data.chatId);
        setCreditsRemaining(res.data.creditsRemaining);
        if (res.data.aiQueriesRemaining !== undefined) {
          setAiQueriesRemaining(res.data.aiQueriesRemaining);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to get response';
      const displayMsg = errorMsg.includes('Insufficient credits')
        ? locale === 'ar' ? 'ليس لديك رصيد كافٍ. يرجى شراء المزيد من الأرصدة.' : 'You don\'t have enough credits. Please purchase more from your dashboard.'
        : errorMsg.includes('not configured')
        ? locale === 'ar' ? 'مساعد الذكاء الاصطناعي غير متاح حالياً.' : 'AI assistant is currently unavailable. Please try again later.'
        : `Sorry, something went wrong. ${errorMsg}`;
      setMessages((prev) => [...prev, { role: 'assistant', content: displayMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || loading || identifying) return;
    // Reset input
    e.target.value = '';

    // Show image preview in chat
    const imageUrl = URL.createObjectURL(file);
    setMessages((prev) => [...prev, {
      role: 'user',
      content: locale === 'ar' ? 'تحديد هذا المحول الحفاز' : 'Identify this converter',
      imageUrl,
    }]);
    setIdentifying(true);

    try {
      const res = await api.identifyConverterByImage(file, undefined, token, locale);
      if (res.data) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: res.data.identification,
          converters: res.data.converters || [],
        }]);
        setCreditsRemaining(res.data.creditsRemaining);
        if (res.data.aiQueriesRemaining !== undefined) {
          setAiQueriesRemaining(res.data.aiQueriesRemaining);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to identify converter';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIdentifying(false);
    }
  };

  // Don't render until client-side hydration is complete
  if (!mounted || isLoading) return null;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center glow-primary"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[500px]"
          >
            <Card className="bg-card border-border shadow-2xl flex flex-col max-h-[500px]">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">
                    {locale === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
                  </span>
                </div>
                {creditsRemaining !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    <span>{creditsRemaining} {locale === 'ar' ? 'رصيد' : 'cr'}</span>
                    {aiQueriesRemaining !== null && (
                      <span className="text-primary/70">· {aiQueriesRemaining} {locale === 'ar' ? 'استعلام' : 'AI'}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[350px]">
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {locale === 'ar' ? 'سجل الدخول لاستخدام المساعد' : 'Sign in to use the AI assistant'}
                    </p>
                    <Button size="sm" asChild>
                      <Link href={`/${locale}/login`}>
                        {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                      </Link>
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ar' ? 'اسألني عن أي محول حفاز!' : 'Ask me about any converter!'}
                    </p>
                    <div className="mt-3 space-y-1">
                      {suggestions.map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); }}
                          className="block w-full text-left text-xs text-primary/70 hover:text-primary px-3 py-1.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-secondary text-foreground'
                      }`}>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Uploaded" className="rounded-md mb-2 max-h-32 object-cover" />
                        )}
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                        {/* Converter cards from API structured data */}
                        {msg.converters && msg.converters.length > 0 && (
                          <div className="mt-2">
                            {msg.converters.map((c) => (
                              <ConverterCardInline key={c.id} data={c} locale={locale} />
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {(loading || identifying) && (
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-secondary rounded-lg px-3 py-2">
                      {identifying ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {locale === 'ar' ? 'جاري التعرف...' : 'Identifying converter...'}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {isAuthenticated && (
                <div className="p-3 border-t border-border">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2.5 flex-shrink-0"
                      disabled={loading || identifying}
                      onClick={() => fileInputRef.current?.click()}
                      title={locale === 'ar' ? 'تحديد المحول بالصورة' : 'Identify converter by photo'}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={placeholder}
                      className="h-9 text-sm bg-background"
                      disabled={loading || identifying}
                    />
                    <Button type="submit" size="sm" className="h-9 px-3" disabled={loading || identifying || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <div className="text-[10px] text-muted-foreground mt-1 text-center">
                    {locale === 'ar' ? 'التقط صورة للمحول الحفاز للتعرف عليه (رصيد واحد)' : 'Snap a photo of a converter to identify it (1 credit)'}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
