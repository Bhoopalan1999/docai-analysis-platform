'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download, Maximize, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PDFToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onDownload: () => void;
  onFullscreen: () => void;
  onToggleThumbnails: () => void;
  showThumbnails: boolean;
  className?: string;
}

export function PDFToolbar({
  currentPage,
  totalPages,
  zoom,
  rotation,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onRotate,
  onPreviousPage,
  onNextPage,
  onDownload,
  onFullscreen,
  onToggleThumbnails,
  showThumbnails,
  className,
}: PDFToolbarProps) {
  const handleZoomSliderChange = (values: number[]) => {
    onZoomChange(values[0]);
  };

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
