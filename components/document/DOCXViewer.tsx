'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, ZoomIn, ZoomOut } from 'lucide-react';

export interface DOCXViewerProps {
  documentId: string;
  fileName?: string;
  onDownload?: () => void;
  className?: string;
}

export function DOCXViewer({ documentId, onDownload, className }: DOCXViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/content`);

        if (!response.ok) {
          throw new Error('Failed to fetch document content');
        }

        const data = await response.json();
        if (data.success && data.html) {
          setHtmlContent(data.html);
        } else {
          throw new Error('No HTML content available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [documentId]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Fallback: try to download from S3
      window.open(`/api/documents/${documentId}/download`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <p className="text-destructive font-medium mb-2">Failed to load document</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div
          className="docx-zoom-wrapper"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <div
            className="p-8 prose prose-sm max-w-none dark:prose-invert docx-content"
            dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
