'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import Image from 'next/image';

export interface PDFThumbnailsProps {
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  pdfUrl: string;
  className?: string;
}

export function PDFThumbnails({ totalPages, currentPage, onPageSelect, pdfUrl, className }: PDFThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // Scroll to current page thumbnail (debounced)
  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Only scroll if not already scrolling programmatically
    if (!isScrollingProgrammatically.current) {
      scrollTimeoutRef.current = setTimeout(() => {
        if (containerRef.current && currentPage > 0) {
          const thumbnailElement = containerRef.current.querySelector(`[data-page="${currentPage}"]`) as HTMLElement;
          if (thumbnailElement && scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
            if (viewport) {
              const elementRect = thumbnailElement.getBoundingClientRect();
              const viewportRect = viewport.getBoundingClientRect();
              const scrollTop =
                viewport.scrollTop +
                (elementRect.top - viewportRect.top) -
                viewportRect.height / 2 +
                elementRect.height / 2;
              
              viewport.scrollTo({
                top: scrollTop,
                behavior: 'smooth',
              });
            }
          }
        }
      }, 100);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentPage]);

  // Load thumbnails on mount
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!pdfUrl || totalPages === 0) return;

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;

        const newThumbnails = new Map<number, string>();

        // Load first 10 pages immediately
        const pagesToLoad = Math.min(totalPages, 10);
        for (let pageNum = 1; pageNum <= pagesToLoad; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;

            newThumbnails.set(pageNum, canvas.toDataURL());
          } catch (err) {
            console.error(`Failed to load thumbnail for page ${pageNum}:`, err);
          }
        }

        setThumbnails(newThumbnails);
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnails();
  }, [pdfUrl, totalPages]);

  // Lazy load individual thumbnail
  const loadThumbnail = useCallback(
    async (pageNum: number) => {
      if (thumbnails.has(pageNum)) return;

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        setThumbnails((prev) => {
          const newMap = new Map(prev);
          newMap.set(pageNum, canvas.toDataURL());
          return newMap;
        });
      } catch (error) {
        console.error(`Failed to load thumbnail for page ${pageNum}:`, error);
      }
    },
    [pdfUrl, thumbnails]
  );

  // Handle thumbnail click
  const handleThumbnailClick = useCallback(
    (pageNum: number) => {
      isScrollingProgrammatically.current = true;
      onPageSelect(pageNum);
      
      // Reset flag after a delay
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 500);
    },
    [onPageSelect]
  );

  if (totalPages === 0) {
    return (
      <div className={cn('w-48 border-r border-border bg-muted/30', className)}>
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pages (0)
          </h3>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">No pages to display</div>
      </div>
    );
  }

  return (
    <div className={cn('w-48 border-r border-border bg-muted/30', className)}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Pages ({totalPages})
        </h3>
      </div>
      <ScrollArea
        className="h-full"
        ref={scrollAreaRef}
      >
        <div
          className="p-2 space-y-2"
          ref={containerRef}
        >
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading thumbnails...</div>
          ) : (
            Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const thumbnail = thumbnails.get(pageNum);
              const isCurrentPage = pageNum === currentPage;

              return (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  onClick={() => handleThumbnailClick(pageNum)}
                  onMouseEnter={() => loadThumbnail(pageNum)}
                  className={cn(
                    'cursor-pointer rounded-md border-2 transition-all p-2',
                    isCurrentPage
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  {thumbnail ? (
                    <Image
                      width={160}
                      height={200}
                      loading="lazy"
                      src={thumbnail}
                      alt={`Page ${pageNum}`}
                      className="w-full h-auto rounded object-cover"
                    />
                  ) : (
                    <div className="aspect-[8.5/11] bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">{pageNum}</span>
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 font-medium">{pageNum}</div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
