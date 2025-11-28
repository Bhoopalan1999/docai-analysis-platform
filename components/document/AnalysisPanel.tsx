'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DocumentAnalysis } from './DocumentAnalysis';

export interface AnalysisPanelProps {
  documentId?: string;
  fileName?: string;
  className?: string;
  onToggle?: () => void;
  isOpen?: boolean;
}

export function AnalysisPanel({ documentId, fileName, className, onToggle, isOpen = true }: AnalysisPanelProps) {
  if (!documentId) {
    return (
      <div
        className={cn(
          'flex flex-col h-full bg-background border-l border-border transition-all duration-300',
          !isOpen && 'w-0 overflow-hidden',
          isOpen && 'w-lg',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold">Analysis</h3>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0"
            >
              <span className="sr-only">Toggle panel</span>×
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">No document selected</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l border-border transition-all duration-300',
        !isOpen && 'w-0 overflow-hidden',
        isOpen && 'w-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Analysis</h3>
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            <span className="sr-only">Toggle panel</span>×
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DocumentAnalysis
          documentId={documentId}
          fileName={fileName || 'Document'}
          className="h-full"
        />
      </div>
    </div>
  );
}
