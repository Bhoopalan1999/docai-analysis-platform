'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { LoadError, Plugin, PluginOnDocumentLoad, PluginOnTextLayerRender } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

// Import CSS styles for plugins (CRITICAL for proper functionality)
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewerComponent = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Viewer), { ssr: false });
const Worker = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Worker), { ssr: false });

export interface PDFViewerProps {
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

export function PDFViewer({ pdfUrl, fileName, onDownload, className }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<HTMLDivElement>(null);

  // Use refs to track the latest state without causing re-renders in the plugin
  const currentPageRef = useRef(currentPage);
  const currentPageCallbackRef = useRef((page: number) => {
    console.log('📄 Page changed via scroll:', page);
    setCurrentPage(page);
  });

  // Update refs when state changes
  useEffect(() => {
    currentPageRef.current = currentPage;
    currentPageCallbackRef.current = (page: number) => {
      if (page !== currentPageRef.current && page > 0) {
        console.log('📄 Page changed via scroll:', page);
        setCurrentPage(page);
        currentPageRef.current = page;
      }
    };
  }, [currentPage]);

  // Create a custom plugin to track page and zoom changes using refs
  const stateTrackerPlugin = useRef<Plugin>({
    install: () => {
      console.log('🔧 State tracker plugin installing...');

      return {
        onDocumentLoad: (props: PluginOnDocumentLoad) => {
          console.log('📚 Document loaded in plugin:', props.doc.numPages);

          // Mark viewer as ready after document loads and pages are rendered
          setTimeout(() => {
            const allPages = document.querySelectorAll('.rpv-core__page-layer');
            console.log(`📄 Found ${allPages.length} page elements in DOM (first check)`);

            setTimeout(() => {
              const allPages2 = document.querySelectorAll('.rpv-core__page-layer');
              console.log(`📄 Found ${allPages2.length} page elements in DOM (second check)`);

              setViewerReady(true);
              console.log('✅ Viewer is now ready for navigation');
            }, 1500);
          }, 500);
        },
        onTextLayerRender: (props: PluginOnTextLayerRender) => {
          const newPage = props.pageIndex + 1;
          currentPageCallbackRef.current(newPage);
        },
      };
    },
  }).current;

  // Refs to hold plugin instances (stable across renders)
  const pageNavigationPluginRef = useRef(pageNavigationPlugin());
  const zoomPluginRef = useRef(zoomPlugin());

  // Extract zoom method from plugin
  const zoomTo = zoomPluginRef.current.zoomTo;

  // Get the viewer's scroll container and page elements
  const getViewerScrollContainer = useCallback(() => {
    const selectors = [
      '.rpv-core__viewer',
      '.rpv-core__inner-pages',
      '[data-testid="core__viewer"]',
      '.pdf-viewer-container > div > div',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element && element.scrollHeight > element.clientHeight) {
        console.log('✅ Found scroll container with selector:', selector);
        return element;
      }
    }

    const viewerContainer = document.querySelector('.pdf-viewer-container');
    if (viewerContainer) {
      const scrollable = Array.from(viewerContainer.querySelectorAll('*')).find((el) => {
        const htmlEl = el as HTMLElement;
        return htmlEl.scrollHeight > htmlEl.clientHeight && htmlEl.scrollTop !== undefined;
      }) as HTMLElement | undefined;
      if (scrollable) {
        console.log('✅ Found scrollable container via fallback');
        return scrollable;
      }
    }

    console.warn('❌ Could not find scroll container');
    return null;
  }, []);

  const getPageElement = useCallback((pageIndex: number) => {
    const selectors = [
      `.rpv-core__page-layer[data-page-index="${pageIndex}"]`,
      `[data-testid="core__page-layer-${pageIndex}"]`,
      `.rpv-core__page-layer:nth-of-type(${pageIndex + 1})`,
      `.rpv-core__page-layer:nth-child(${pageIndex + 1})`,
      `[data-page-index="${pageIndex}"]`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        console.log(`✅ Found page ${pageIndex} with selector:`, selector);
        return element;
      }
    }

    const allPages = document.querySelectorAll('.rpv-core__page-layer');
    if (allPages.length > pageIndex) {
      console.log(`✅ Found page ${pageIndex} via fallback (total pages: ${allPages.length})`);
      return allPages[pageIndex] as HTMLElement;
    }

    console.warn(`❌ Could not find page element for page index ${pageIndex}`);
    return null;
  }, []);

  // Scroll tracking logic (simplified version)
  useEffect(() => {
    if (!viewerReady || totalPages === 0) return;

    let scrollTimeout: NodeJS.Timeout | null = null;
    const scrollContainer = getViewerScrollContainer();
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const viewportTop = containerRect.top;
        const viewportBottom = containerRect.bottom;
        const viewportCenter = viewportTop + containerRect.height / 2;

        let closestPage = 1;
        let closestDistance = Infinity;
        let maxVisibleRatio = 0;

        for (let i = 0; i < totalPages; i++) {
          const pageElement = getPageElement(i);
          if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const pageTop = pageRect.top;
            const pageBottom = pageRect.bottom;
            const pageCenter = pageTop + pageRect.height / 2;

            const visibleTop = Math.max(viewportTop, pageTop);
            const visibleBottom = Math.min(viewportBottom, pageBottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibleRatio = visibleHeight / pageRect.height;

            const distance = Math.abs(pageCenter - viewportCenter);

            if (visibleRatio > maxVisibleRatio || (visibleRatio === maxVisibleRatio && distance < closestDistance)) {
              maxVisibleRatio = visibleRatio;
              closestDistance = distance;
              closestPage = i + 1;
            }
          }
        }

        const latestCurrentPage = currentPageRef.current;
        if (closestPage !== latestCurrentPage && closestPage > 0) {
          setCurrentPage(closestPage);
          currentPageRef.current = closestPage;
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [viewerReady, totalPages, getViewerScrollContainer, getPageElement]);

  // Configure PDF.js worker
  useEffect(() => {
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

  // Reset loading state when PDF URL changes
  useEffect(() => {
    if (pdfUrl && workerReady) {
      setLoading(true);
      setError(null);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      fetch(pdfUrl, { method: 'HEAD', credentials: 'include' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`PDF URL returned ${response.status}: ${response.statusText}`);
          }
        })
        .catch((err) => {
          console.error('PDF URL accessibility check failed:', err);
        });

      loadingTimeoutRef.current = setTimeout(() => {
        setLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('PDF load timeout after 60 seconds');
            setError('PDF took too long to load. Please try refreshing the page.');
            return false;
          }
          return currentLoading;
        });
      }, 60000);

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [pdfUrl, workerReady]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rotationRef.current) {
      rotationRef.current.style.setProperty('--rotation', `${rotation}deg`);
    }
  }, [rotation]);

  useEffect(() => {
    if (currentPage > 0 && totalPages > 0 && fileName) {
      localStorage.setItem(`pdf-page-${fileName}`, currentPage.toString());
    }
  }, [currentPage, fileName, totalPages]);

  const handleRenderError = useCallback((renderError: LoadError): React.ReactElement => {
    console.error('PDF render error:', renderError);
    setError(`Failed to render PDF: ${renderError.message || 'Unknown error'}`);
    setLoading(false);
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-medium mb-2">Error loading PDF</p>
        <p className="text-sm text-muted-foreground">{renderError.message || 'Unknown error'}</p>
      </div>
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 0.25, 3);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomSliderChange = useCallback(
    (newZoom: number) => {
      setZoom(newZoom);
      zoomTo(newZoom);
    },
    [zoomTo]
  );

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const scrollToPage = useCallback(
    (pageIndex: number, retries = 5) => {
      const scrollContainer = getViewerScrollContainer();
      if (!scrollContainer) {
        if (retries > 0) {
          setTimeout(() => scrollToPage(pageIndex, retries - 1), 200);
        }
        return false;
      }

      const pageElement = getPageElement(pageIndex);

      if (pageElement) {
        if (pageIndex === 0) {
          scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
          return true;
        }

        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = pageElement.getBoundingClientRect();
        const pageTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        const viewportHeight = containerRect.height;
        const pageHeight = elementRect.height;
        const scrollTop = pageTop - (viewportHeight - pageHeight) / 2 - 10;

        scrollContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
        return true;
      } else {
        if (retries > 0) {
          const allPages = document.querySelectorAll('.rpv-core__page-layer');
          let avgPageHeight = 800;

          if (allPages.length > 0) {
            const totalHeight = Array.from(allPages).reduce((sum, page) => {
              return sum + (page as HTMLElement).offsetHeight;
            }, 0);
            avgPageHeight = totalHeight / allPages.length;
          }

          const containerRect = scrollContainer.getBoundingClientRect();
          const viewportHeight = containerRect.height;
          const estimatedScrollTop = pageIndex * avgPageHeight;
          scrollContainer.scrollTo({
            top: Math.max(0, estimatedScrollTop - viewportHeight / 2),
            behavior: 'smooth',
          });

          setTimeout(() => scrollToPage(pageIndex, retries - 1), 400);
        }
        return false;
      }
    },
    [getPageElement, getViewerScrollContainer]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const targetPage = currentPage - 2;
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage - 1);
      }
    }
  }, [currentPage, scrollToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const targetPage = currentPage;
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage + 1);
      }
    }
  }, [currentPage, totalPages, scrollToPage]);

  const handlePageSelect = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        const targetPage = page - 1;
        if (scrollToPage(targetPage)) {
          setCurrentPage(page);
        }
      }
    },
    [totalPages, scrollToPage]
  );

  const jumpToPage = useCallback(
    (page: number) => {
      handlePageSelect(page);
    },
    [handlePageSelect]
  );

  const handleDocumentLoad = useCallback(
    (e: { doc?: { numPages?: number }; file?: unknown }) => {
      try {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        const doc = e?.doc;
        if (doc && typeof doc.numPages === 'number') {
          const numPages = doc.numPages;
          setTotalPages(numPages);

          const savedPage = localStorage.getItem(`pdf-page-${fileName}`);
          if (savedPage) {
            const page = parseInt(savedPage, 10);
            if (page >= 1 && page <= numPages) {
              setTimeout(() => {
                scrollToPage(page - 1);
                setCurrentPage(page);
              }, 500);
            } else {
              setCurrentPage(1);
              jumpToPage(1);
            }
          } else {
            setCurrentPage(1);
            jumpToPage(1);
          }
        }
      } catch (err) {
        console.error('Error processing document load:', err);
        setError('Failed to process PDF document');
      } finally {
        setLoading(false);
      }
    },
    [fileName, jumpToPage, scrollToPage]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousPage, handleNextPage]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
    }
  }, [onDownload, pdfUrl, fileName]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        zoom={zoom}
        rotation={rotation}
        onZoomChange={handleZoomSliderChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onPageJump={jumpToPage}
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
            <div className="flex-1 h-full w-full pdf-viewer-container">
              <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <div
                  className="h-full w-full pdf-viewer-rotation"
                  ref={rotationRef}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <PDFViewerComponent
                    fileUrl={pdfUrl}
                    httpHeaders={{
                      Accept: 'application/pdf',
                    }}
                    withCredentials={true}
                    initialPage={0}
                    defaultScale={1}
                    plugins={[pageNavigationPluginRef.current, zoomPluginRef.current, stateTrackerPlugin]}
                    onDocumentLoad={handleDocumentLoad}
                    renderError={handleRenderError}
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
