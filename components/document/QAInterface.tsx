'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Bot, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  conversationId?: string;
  sources?: Array<{
    text: string;
    score: number;
    metadata: {
      documentId?: string;
      pageNumber?: number;
      chunkIndex?: number;
      text?: string;
      userId?: string;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      endChar?: number;
      fileName?: string;
      fileType?: string;
      startChar?: number;
    };
  }>;
  model?: string;
  createdAt: Date | string;
}

export interface QAInterfaceProps {
  documentId: string;
  conversationId?: string;
  onConversationIdChange?: (id: string) => void;
  className?: string;
}

export function QAInterface({ documentId, conversationId, onConversationIdChange, className }: QAInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    if (currentConversationId) {
      loadConversationHistory(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 128; // max-h-32 = 128px
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  // Auto-scroll to bottom when new messages arrive or loading state changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
      }
    }
  }, [messages, loading]);

  const loadConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/ai/query?conversationId=${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMessages(
            data.messages.map(
              (msg: {
                id: string;
                role: 'user' | 'assistant';
                content: string;
                sources?: unknown;
                model?: string;
                createdAt: string | Date;
              }) => ({
                ...msg,
                createdAt: new Date(msg.createdAt),
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          documentIds: [documentId],
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          model: data.model,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation ID if it's a new conversation
        if (data.conversationId && data.conversationId !== currentConversationId) {
          setCurrentConversationId(data.conversationId);
          onConversationIdChange?.(data.conversationId);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${
          error instanceof Error ? error.message : 'Failed to process your question. Please try again.'
        }`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 min-h-0 max-h-[calc(100%-190px)] flex flex-col overflow-hidden">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full p-4 qa-scroll-area-root"
        >
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center min-h-0">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ask questions about your document</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Get instant answers powered by AI. Ask about key points, summaries, or specific details in your
                  document.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}

                <div className={cn('flex flex-col gap-2 max-w-[80%]', message.role === 'user' && 'items-end')}>
                  <Card
                    className={cn(
                      'p-3',
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </Card>

                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.sources.slice(0, 3).map((source, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Source {idx + 1}
                          {source.metadata.pageNumber && ` (Page ${source.metadata.pageNumber})`}
                        </Badge>
                      ))}
                      {message.sources.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          +{message.sources.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {message.role === 'assistant' && message.model && (
                    <span className="text-xs text-muted-foreground">Powered by {message.model}</span>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <Card className="p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document..."
            disabled={loading}
            className="flex-1 resize-none overflow-y-auto max-h-32 min-h-[40px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
