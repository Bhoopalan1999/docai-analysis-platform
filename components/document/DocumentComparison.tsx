'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { EntitiesTable } from './EntitiesTable';
import { SentimentGauge } from './SentimentGauge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
}

interface DocumentComparisonProps {
  documents: Document[];
  className?: string;
}

/**
 * DocumentComparison - Side-by-side comparison of documents
 */
export function DocumentComparison({ documents, className }: DocumentComparisonProps) {
  const [leftDocId, setLeftDocId] = useState<string>('');
  const [rightDocId, setRightDocId] = useState<string>('');

  const availableDocs = documents.filter((d) => d.status === 'completed');

  const canCompare = leftDocId && rightDocId && leftDocId !== rightDocId;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Document Comparison</CardTitle>
          <CardDescription>Compare insights from two documents side-by-side</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Document Selection */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Document</label>
              <Select
                value={leftDocId}
                onValueChange={setLeftDocId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocs.map((doc) => (
                    <SelectItem
                      key={doc.id}
                      value={doc.id}
                    >
                      {doc.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Right Document</label>
              <Select
                value={rightDocId}
                onValueChange={setRightDocId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocs
                    .filter((doc) => doc.id !== leftDocId)
                    .map((doc) => (
                      <SelectItem
                        key={doc.id}
                        value={doc.id}
                      >
                        {doc.fileName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canCompare && (
            <div className="space-y-6">
              {/* Comparison View */}
              <Tabs
                defaultValue="summary"
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">
                    <FileText className="h-4 w-4 mr-2" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="entities">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Entities
                  </TabsTrigger>
                  <TabsTrigger value="sentiment">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Sentiment
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="summary"
                  className="mt-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === leftDocId)?.fileName}
                      </h3>
                      <SummaryCard documentId={leftDocId} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === rightDocId)?.fileName}
                      </h3>
                      <SummaryCard documentId={rightDocId} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="entities"
                  className="mt-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === leftDocId)?.fileName}
                      </h3>
                      <EntitiesTable documentId={leftDocId} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === rightDocId)?.fileName}
                      </h3>
                      <EntitiesTable documentId={rightDocId} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="sentiment"
                  className="mt-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === leftDocId)?.fileName}
                      </h3>
                      <SentimentGauge documentId={leftDocId} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {availableDocs.find((d) => d.id === rightDocId)?.fileName}
                      </h3>
                      <SentimentGauge documentId={rightDocId} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!canCompare && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select two different documents to compare</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
