'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDocumentSummary, useInvalidateSummary } from '@/lib/hooks/useDocumentSummary';

export interface SummaryCardProps {
  documentId: string;
  className?: string;
}

export function SummaryCard({ documentId, className }: SummaryCardProps) {
  // Use React Query hook - automatically handles caching, refetching, and state management
  const { data, isLoading, error, refetch, isFetching } = useDocumentSummary(documentId);
  const invalidateSummary = useInvalidateSummary();

  const handleRefresh = () => {
    // Force refetch by invalidating cache
    invalidateSummary(documentId);
    refetch();
  };

  const summary = data?.summary;
  const errorMessage = error instanceof Error ? error.message : 'Failed to load summary';

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Summary</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading && !summary && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          <p>{errorMessage}</p>
          <Button
            variant="link"
            size="sm"
            onClick={handleRefresh}
            className="p-0 h-auto mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {summary && <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>}
    </Card>
  );
}
