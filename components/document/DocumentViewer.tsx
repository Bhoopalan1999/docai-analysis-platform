'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Dynamically import PDF viewer to avoid SSR issues
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pageNavPlugin, setPageNavPlugin] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [zoomPluginInst, setZoomPluginInst] = useState<any>(null);

  // Initialize plugins on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && workerReady) {
      Promise.all([
        import('@react-pdf-viewer/page-navigation').then((mod) => mod.pageNavigationPlugin()),
        import('@react-pdf-viewer/zoom').then((mod) => mod.zoomPlugin()),
      ])
        .then(([pageNav, zoom]) => {
          setPageNavPlugin(pageNav);
          setZoomPluginInst(zoom);
        })
        .catch((err) => {
          console.error('Failed to load plugins:', err);
        });
    }
  }, [workerReady]);

  // Get plugin methods
  const jumpToPage = pageNavPlugin?.jumpToPage;
  const zoomTo = zoomPluginInst?.zoomTo;

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const handlePageChange = (e: { currentPage: number }) => {
    const newPage = Math.max(1, Math.min(e.currentPage || 1, totalPages || 1));
    if (newPage !== currentPage && newPage > 0) {
      setCurrentPage(newPage);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const roundedZoom = Math.round(newZoom * 10) / 10;
    if (Math.abs(roundedZoom - zoom) > 0.05 && zoomTo) {
      setZoom(roundedZoom);
      zoomTo(roundedZoom);
    }
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    // Rotation will be handled via CSS transform on the container
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && jumpToPage) {
      const newPage = currentPage - 1;
      jumpToPage(newPage - 1); // Plugin uses 0-based index
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && jumpToPage) {
      const newPage = currentPage + 1;
      jumpToPage(newPage - 1); // Plugin uses 0-based index
    }
  };

  const handlePageSelect = (page: number) => {
    const targetPageNum = Math.max(1, Math.min(page, totalPages || 1));
    if (targetPageNum !== currentPage && totalPages > 0 && jumpToPage) {
      jumpToPage(targetPageNum - 1); // Plugin uses 0-based index
    }
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

          {!error && pdfUrl && workerReady && pageNavPlugin && zoomPluginInst && (
            <div className="flex-1 h-full w-full pdf-viewer-container">
              <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <div
                  className="h-full w-full pdf-viewer-rotation"
                  style={{ '--rotation': `${rotation}deg` } as React.CSSProperties}
                >
                  <PDFViewer
                    fileUrl={pdfUrl}
                    httpHeaders={{
                      Accept: 'application/pdf',
                    }}
                    withCredentials={true}
                    plugins={[pageNavPlugin, zoomPluginInst]}
                    onDocumentLoad={(e: { doc?: { numPages?: number }; file?: unknown }) => {
                      try {
                        // Clear timeout since PDF loaded successfully
                        if (loadingTimeoutRef.current) {
                          clearTimeout(loadingTimeoutRef.current);
                          loadingTimeoutRef.current = null;
                        }

                        const doc = e?.doc;
                        if (doc && typeof doc.numPages === 'number') {
                          const numPages = doc.numPages;
                          setTotalPages(numPages);
                          // Validate current page
                          const validPage = Math.max(1, Math.min(currentPage, numPages));
                          if (validPage !== currentPage && currentPage > 0) {
                            setCurrentPage(validPage);
                          }
                          setLoading(false);
                        } else {
                          setLoading(false);
                        }
                      } catch (err) {
                        console.error('Error processing document load:', err);
                        setError('Failed to process PDF document');
                        setLoading(false);
                      }
                    }}
                    onPageChange={handlePageChange}
                    initialPage={Math.max(0, currentPage - 1)}
                    defaultScale={zoom}
                    renderError={(error) => {
                      console.error('PDF render error:', error);
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
