'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PDFViewer } from './PDFViewer';
import { DOCXViewer } from './DOCXViewer';
import { ExcelViewer } from './ExcelViewer';
import { AnalysisPanel } from './AnalysisPanel';
import { Button } from '@/components/ui/button';
import { PanelRightOpen } from 'lucide-react';

export interface DocumentViewerProps {
  documentId: string;
  fileType: 'pdf' | 'docx' | 'xlsx';
  fileName: string;
  pdfUrl?: string; // Only needed for PDF
  onDownload?: () => void;
  className?: string;
}

export function DocumentViewer({ documentId, fileType, fileName, pdfUrl, onDownload, className }: DocumentViewerProps) {
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);

  const renderViewer = () => {
    switch (fileType) {
      case 'pdf':
        if (!pdfUrl) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <p className="text-destructive font-medium mb-2">PDF URL is required</p>
                <p className="text-sm text-muted-foreground">Please provide a valid PDF URL</p>
              </div>
            </div>
          );
        }
        return (
          <PDFViewer
            pdfUrl={pdfUrl}
            fileName={fileName}
            onDownload={onDownload}
          />
        );

      case 'docx':
        return (
          <DOCXViewer
            documentId={documentId}
            fileName={fileName}
            onDownload={onDownload}
          />
        );

      case 'xlsx':
        return (
          <ExcelViewer
            documentId={documentId}
            fileName={fileName}
            onDownload={onDownload}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <p className="text-destructive font-medium mb-2">Unsupported file type</p>
              <p className="text-sm text-muted-foreground">File type {fileType} is not supported</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Document Viewer - Left Side */}
      <div className={cn('flex-1 flex flex-col overflow-hidden', showAnalysisPanel && 'border-r border-border')}>
        {renderViewer()}
      </div>

      {/* Analysis Panel - Right Side */}
      <AnalysisPanel
        documentId={documentId}
        fileName={fileName}
        isOpen={showAnalysisPanel}
        onToggle={() => setShowAnalysisPanel(!showAnalysisPanel)}
      />

      {/* Toggle Button (when panel is closed) */}
      {!showAnalysisPanel && (
        <div className="absolute right-4 top-20 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalysisPanel(true)}
            className="shadow-lg"
          >
            <PanelRightOpen className="h-4 w-4 mr-2" />
            Show Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
