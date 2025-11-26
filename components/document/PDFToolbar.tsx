'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download, Maximize, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PDFToolbarProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  zoom: number;
  rotation: number;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageJump?: (page: number) => void;
  onDownload: () => void;
  onFullscreen: () => void;
  onToggleThumbnails: () => void;
  showThumbnails: boolean;
  className?: string;
}

export function PDFToolbar({
  currentPage,
  setCurrentPage,
  totalPages,
  zoom,
  rotation,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onRotate,
  onPreviousPage,
  onNextPage,
  onPageJump,
  onDownload,
  onFullscreen,
  onToggleThumbnails,
  showThumbnails,
  className,
}: PDFToolbarProps) {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleZoomSliderChange = (values: number[]) => {
    onZoomChange(values[0]);
  };

  // Handle page input with debouncing and auto-correction
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow numbers (empty string is allowed for clearing)
    if (value === '' || /^\d+$/.test(value)) {
      // setPageInput(value);
      setCurrentPage(parseInt(value, 10));

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // If input is not empty, set up debounced jump
      if (value !== '' && onPageJump) {
        debounceTimeoutRef.current = setTimeout(() => {
          const pageNum = parseInt(value, 10);
          if (!isNaN(pageNum) && pageNum >= 1) {
            // Auto-correct out-of-bounds values
            const correctedPage = Math.min(pageNum, totalPages);
            const finalPage = Math.max(1, correctedPage);

            // If value was corrected, update the input display
            if (finalPage !== pageNum) {
              // setPageInput(finalPage.toString());
              setCurrentPage(finalPage);
            }

            // Jump to the page
            onPageJump(finalPage);

            // Clear input after a short delay to show the jump happened
            setTimeout(() => {
              // setPageInput('');
            }, 300);
          }
        }, 800); // 800ms debounce - wait for user to finish typing
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('flex items-center gap-2 p-2 bg-background border-b border-border', className)}>
      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage <= 1 || totalPages === 0}
          className="h-8 w-8 p-0"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {totalPages > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="h-8 w-8 p-0"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {onPageJump && (
          <div className="flex items-center gap-1 ml-1">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentPage}
              onChange={handlePageInputChange}
              placeholder="Page"
              className="h-8 w-16 text-center text-xs px-2"
              title={`Type page number (1-${totalPages})`}
            />
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          className="h-8 w-8 p-0"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-24">
          <Slider
            value={[zoom]}
            onValueChange={handleZoomSliderChange}
            min={0.5}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={zoom >= 3}
          className="h-8 w-8 p-0"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[40px] text-right">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Rotation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRotate}
        className="h-8 px-3"
        title="Rotate clockwise"
      >
        <RotateCw className="h-4 w-4 mr-2" />
        <span className="text-xs">{rotation}°</span>
      </Button>

      <div className="flex-1" />

      {/* Thumbnails Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleThumbnails}
        className={cn('h-8 px-3', showThumbnails && 'bg-accent')}
        title={showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}
      >
        <FileText className="h-4 w-4 mr-2" />
        <span className="text-xs">Pages</span>
      </Button>

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDownload}
        className="h-8 px-3"
        title="Download PDF"
      >
        <Download className="h-4 w-4 mr-2" />
        <span className="text-xs">Download</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onFullscreen}
        className="h-8 px-3"
        title="Fullscreen"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
