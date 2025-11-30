'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QAInterface } from './QAInterface';
import { SummaryCard } from './SummaryCard';
import { EntitiesTable } from './EntitiesTable';
import { SentimentGauge } from './SentimentGauge';
import { ExportMenu } from './ExportMenu';
import { ConversationList } from './ConversationList';
import { MessageSquare, FileText, TrendingUp, BarChart3 } from 'lucide-react';

export interface DocumentAnalysisProps {
  documentId: string;
  fileName: string;
  className?: string;
}

export function DocumentAnalysis({ documentId, fileName, className }: DocumentAnalysisProps) {
  const [conversationId, setConversationId] = useState<string | undefined>();

  const handleNewConversation = () => {
    setConversationId(undefined);
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
  };

  return (
    <div className={className}>
      <Tabs
        defaultValue="chat"
        className="h-full flex flex-col"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <TabsList>
            <TabsTrigger
              value="chat"
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Q&A
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="entities"
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Entities
            </TabsTrigger>
            <TabsTrigger
              value="sentiment"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Sentiment
            </TabsTrigger>
          </TabsList>
          <ExportMenu
            documentId={documentId}
            fileName={fileName}
          />
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex">
          <TabsContent
            value="chat"
            className="h-full m-0 flex flex-col min-h-0 flex-1"
          >
            <div className="flex h-full">
              {/* Conversation Sidebar */}
              <ConversationList
                documentId={documentId}
                currentConversationId={conversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                className="w-64 shrink-0"
              />

              {/* Chat Interface */}
              <div className="flex-1 min-w-0">
                <QAInterface
                  documentId={documentId}
                  conversationId={conversationId}
                  onConversationIdChange={setConversationId}
                  className="h-full"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="summary"
            className="h-full overflow-y-auto p-4 m-0"
          >
            <SummaryCard documentId={documentId} />
          </TabsContent>

          <TabsContent
            value="entities"
            className="h-full overflow-y-auto p-4 m-0"
          >
            <EntitiesTable documentId={documentId} />
          </TabsContent>

          <TabsContent
            value="sentiment"
            className="h-full overflow-y-auto p-4 m-0"
          >
            <SentimentGauge documentId={documentId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
