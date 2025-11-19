'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Dynamically import PDF viewer to avoid SSR issues
// Note: CSS is imported separately in globals.css or loaded by the viewer itself
const PDFViewer = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Viewer), { ssr: false });

const Worker = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Worker), { ssr: false });

export interface DocumentViewerProps {
  pdfUrl: string;
  fileName: string;
  highlights?: Array<{
    pageIndex: number;
    text: string;
    position?: { x: number; y: number; width: number; height: number };
  }>;
  onDownload?: () => void;
  className?: string;
}

export function DocumentViewer({ pdfUrl, fileName, onDownload, className }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [targetPage, setTargetPage] = useState<number | null>(null); // For programmatic page navigation
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewerRef = useRef<{
    zoomTo?: (scale: number) => void;
    rotate?: (angle: number) => void;
    scrollToPage?: (page: number) => void;
    jumpToPage?: (page: number) => void;
  } | null>(null);

  // Configure PDF.js worker
  useEffect(() => {
    // Set worker source for PDF.js
    if (typeof window !== 'undefined') {
      import('pdfjs-dist')
        .then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          setWorkerReady(true);
          console.log('PDF.js worker configured');
        })
        .catch((err) => {
          console.error('Failed to load PDF.js:', err);
          setError('Failed to initialize PDF viewer');
        });
    }
  }, []);

  // Reset loading state when PDF URL changes and verify URL accessibility
  useEffect(() => {
    if (pdfUrl && workerReady) {
      setLoading(true);
      setError(null);
      console.log('PDF URL set, waiting for document load:', pdfUrl);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Test if URL is accessible
      fetch(pdfUrl, { method: 'HEAD', credentials: 'include' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`PDF URL returned ${response.status}: ${response.statusText}`);
          }
          console.log('PDF URL is accessible, content-type:', response.headers.get('content-type'));
        })
        .catch((err) => {
          console.error('PDF URL accessibility check failed:', err);
          // Don't set error here, let the PDF viewer handle it
        });

      // Timeout fallback - if PDF doesn't load in 30 seconds, show error
      // Only trigger if still loading (check current state, not closure)
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('PDF load timeout after 30 seconds');
            setError('PDF took too long to load. Please try refreshing the page.');
            return false;
          }
          return currentLoading;
        });
      }, 30000);

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [pdfUrl, workerReady]);

  const handlePageChange = (e: { currentPage: number }) => {
    const newPage = e.currentPage;
    setCurrentPage(newPage);
    // Reset targetPage after navigation completes to prevent unnecessary re-renders
    if (targetPage !== null && newPage === targetPage) {
      setTargetPage(null);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    if (viewerRef.current?.zoomTo) {
      viewerRef.current.zoomTo(newZoom);
    }
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (viewerRef.current?.rotate) {
      viewerRef.current.rotate(newRotation);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      if (viewerRef.current?.scrollToPage) {
        viewerRef.current.scrollToPage(newPage - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      if (viewerRef.current?.scrollToPage) {
        viewerRef.current.scrollToPage(newPage - 1);
      }
    }
  };

  const handlePageSelect = (page: number) => {
    console.log('Page selected:', page);
    setCurrentPage(page);
    setTargetPage(page); // Trigger navigation to this page
    // Force re-render with new initialPage by updating key
    // The PDFViewer will re-render with the new initialPage
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        rotation={rotation}
        onZoomChange={handleZoomChange}
        onRotate={handleRotate}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onDownload={handleDownload}
        onFullscreen={handleFullscreen}
        onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
        showThumbnails={showThumbnails}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <PDFThumbnails
            totalPages={totalPages}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            pdfUrl={pdfUrl}
          />
        )}

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">Failed to load PDF</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!error && pdfUrl && workerReady && (
            <ScrollArea className="flex-1">
              <div className="flex justify-center p-4 w-full h-full">
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    minHeight: '800px',
                  }}
                >
                  <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                    <div
                      className="w-full h-full"
                      style={{ minHeight: '800px' }}
                    >
                      <PDFViewer
                        fileUrl={pdfUrl}
                        httpHeaders={{
                          Accept: 'application/pdf',
                        }}
                        withCredentials={true}
                        onDocumentLoad={(e) => {
                          console.log('PDF document loaded event:', e);
                          console.log('Event keys:', Object.keys(e || {}));
                          try {
                            // Clear timeout since PDF loaded successfully
                            if (loadingTimeoutRef.current) {
                              clearTimeout(loadingTimeoutRef.current);
                              loadingTimeoutRef.current = null;
                            }

                            // Event structure: {doc: PDFDocumentProxy, file: {...}}
                            const doc = (e as any)?.doc;
                            if (doc && typeof doc.numPages === 'number') {
                              console.log(`PDF loaded successfully: ${doc.numPages} pages`);
                              setTotalPages(doc.numPages);
                              setLoading(false);
                            } else {
                              console.warn('Unexpected document load event structure:', {
                                hasDoc: !!doc,
                                docType: typeof doc,
                                numPagesType: typeof doc?.numPages,
                              });
                              // If we can't get page count, assume it loaded and try to continue
                              console.log('Document loaded but page count unavailable, continuing...');
                              setLoading(false);
                            }
                          } catch (err) {
                            console.error('Error processing document load:', err);
                            setError('Failed to process PDF document');
                            setLoading(false);
                          }
                        }}
                        onPageChange={handlePageChange}
                        initialPage={targetPage !== null ? targetPage - 1 : currentPage - 1}
                        key={targetPage !== null ? `pdf-page-${targetPage}` : 'pdf-viewer'}
                        defaultScale={zoom}
                        onZoom={(e: { scale: number }) => {
                          if (e?.scale) {
                            setZoom(e.scale);
                          }
                        }}
                        renderError={(error) => {
                          console.error('PDF render error:', error);
                          console.error('Error details:', {
                            message: error.message,
                            name: error.name,
                          });
                          setError(`Failed to render PDF: ${error.message || 'Unknown error'}`);
                          setLoading(false);
                          return (
                            <div className="p-8 text-center">
                              <p className="text-destructive font-medium mb-2">Error loading PDF</p>
                              <p className="text-sm text-muted-foreground">{error.message || 'Unknown error'}</p>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </Worker>
                </div>
              </div>
            </ScrollArea>
          )}

          {!error && pdfUrl && !workerReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Initializing PDF viewer...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
