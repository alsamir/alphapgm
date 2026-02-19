'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, ArrowRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AiChat {
  id: number;
  messages: Array<{ role: string; content: string }>;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onOpenChat?: (chatId: number) => void;
}

export function AiHistory({ onOpenChat }: Props) {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const [chats, setChats] = useState<AiChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return;
      try {
        const res = await api.getAiHistory(token);
        setChats(res.data || []);
      } catch (err) {
        console.error('Failed to fetch AI history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const getFirstMessage = (chat: AiChat): string => {
    const firstUserMsg = chat.messages?.find((m) => m.role === 'user');
    if (!firstUserMsg) return t('noMessages');
    const content = firstUserMsg.content;
    return content.length > 120 ? content.substring(0, 120) + '...' : content;
  };

  const getLastResponse = (chat: AiChat): string => {
    const assistantMsgs = chat.messages?.filter((m) => m.role === 'assistant') || [];
    const last = assistantMsgs[assistantMsgs.length - 1];
    if (!last) return '';
    const content = last.content;
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  };

  const getMessageCount = (chat: AiChat): number => {
    return chat.messages?.length || 0;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            {t('aiChatHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">{t('noAiConversations')}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {t('startChattingToSeeHistory')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => {
                const isExpanded = expandedId === chat.id;
                return (
                  <div
                    key={chat.id}
                    className="rounded-lg border border-border/50 hover:border-border transition-colors overflow-hidden"
                  >
                    {/* Chat Summary Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : chat.id)}
                      className="w-full text-left p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium leading-snug">
                              {getFirstMessage(chat)}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(chat.updatedAt || chat.createdAt, t)}
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {t('messageCount', { count: getMessageCount(chat) })}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ArrowRight
                          className={`h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border/50">
                        <div className="mt-3 space-y-2">
                          {/* Show last few messages as preview */}
                          {chat.messages?.slice(-4).map((msg, i) => (
                            <div
                              key={i}
                              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              {msg.role === 'assistant' && (
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Bot className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                                  msg.role === 'user'
                                    ? 'bg-primary/20 text-foreground'
                                    : 'bg-secondary text-foreground'
                                }`}
                              >
                                {msg.content.length > 300
                                  ? msg.content.substring(0, 300) + '...'
                                  : msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenChat) {
                                onOpenChat(chat.id);
                              }
                            }}
                          >
                            {t('continueChat')}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(dateStr: string, t: (key: string, values?: Record<string, any>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('daysAgo', { count: diffDays });
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
