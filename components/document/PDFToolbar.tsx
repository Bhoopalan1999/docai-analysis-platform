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

  const zoomIn = () => {
    onZoomChange(Math.min(zoom + 0.25, 3));
  };

  const zoomOut = () => {
    onZoomChange(Math.max(zoom - 0.25, 0.5));
  };

  return (
    <div className={cn('flex items-center gap-2 p-2 bg-background border-b border-border', className)}>
      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
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
          onClick={zoomOut}
          disabled={zoom <= 0.5}
          className="h-8 w-8 p-0"
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
          onClick={zoomIn}
          disabled={zoom >= 3}
          className="h-8 w-8 p-0"
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
      >
        <Download className="h-4 w-4 mr-2" />
        <span className="text-xs">Download</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onFullscreen}
        className="h-8 px-3"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
