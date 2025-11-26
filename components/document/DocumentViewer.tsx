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
          // Use multiple timeouts to ensure pages are fully rendered
          setTimeout(() => {
            const allPages = document.querySelectorAll('.rpv-core__page-layer');
            console.log(`📄 Found ${allPages.length} page elements in DOM (first check)`);

            // Wait a bit more for all pages to render
            setTimeout(() => {
              const allPages2 = document.querySelectorAll('.rpv-core__page-layer');
              console.log(`📄 Found ${allPages2.length} page elements in DOM (second check)`);

              setViewerReady(true);
              console.log('✅ Viewer is now ready for navigation');
            }, 1500);
          }, 500);
        },
        onTextLayerRender: (props: PluginOnTextLayerRender) => {
          // Use callback ref to avoid stale closures
          const newPage = props.pageIndex + 1; // 0-based to 1-based
          currentPageCallbackRef.current(newPage);
        },
      };
    },
  }).current;

  // Refs to hold plugin instances (stable across renders)
  const pageNavigationPluginRef = useRef(pageNavigationPlugin());
  const zoomPluginRef = useRef(zoomPlugin());

  // Extract zoom method from plugin (zoom seems to work, but page navigation doesn't)
  const zoomTo = zoomPluginRef.current.zoomTo;

  // Get the viewer's scroll container and page elements
  const getViewerScrollContainer = useCallback(() => {
    // Try multiple selectors for the scroll container
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

    // Fallback: find any scrollable container in the viewer
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
    // Try multiple selectors as react-pdf-viewer uses different class names
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

    // Fallback: get all page layers and use index
    const allPages = document.querySelectorAll('.rpv-core__page-layer');
    if (allPages.length > pageIndex) {
      console.log(`✅ Found page ${pageIndex} via fallback (total pages: ${allPages.length})`);
      return allPages[pageIndex] as HTMLElement;
    }

    console.warn(`❌ Could not find page element for page index ${pageIndex}`);
    console.log('Available page elements:', document.querySelectorAll('.rpv-core__page-layer').length);
    return null;
  }, []);

  // Use IntersectionObserver and scroll listener to track which page is visible
  useEffect(() => {
    if (!viewerReady || totalPages === 0) return;

    let scrollTimeout: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    const observers: IntersectionObserver[] = [];
    let scrollContainer: HTMLElement | null = null;
    let handleScroll: (() => void) | null = null;
    let mutationObserver: MutationObserver | null = null;

    // Wait a bit for DOM to be fully ready
    const setupTimeout = setTimeout(() => {
      scrollContainer = getViewerScrollContainer();
      if (!scrollContainer) {
        console.warn('⚠️ Scroll container not found for scroll tracking');
        return;
      }

      console.log('✅ Setting up scroll tracking on:', scrollContainer.className);

      // Debounced scroll handler
      handleScroll = () => {
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

          // Find the page with the most visible area in the viewport
          for (let i = 0; i < totalPages; i++) {
            const pageElement = getPageElement(i);
            if (pageElement) {
              const pageRect = pageElement.getBoundingClientRect();
              const pageTop = pageRect.top;
              const pageBottom = pageRect.bottom;
              const pageCenter = pageTop + pageRect.height / 2;

              // Calculate how much of the page is visible
              const visibleTop = Math.max(viewportTop, pageTop);
              const visibleBottom = Math.min(viewportBottom, pageBottom);
              const visibleHeight = Math.max(0, visibleBottom - visibleTop);
              const visibleRatio = visibleHeight / pageRect.height;

              // Also calculate distance from viewport center
              const distance = Math.abs(pageCenter - viewportCenter);

              // Prefer pages with more visibility, but if similar, use distance
              if (visibleRatio > maxVisibleRatio || (visibleRatio === maxVisibleRatio && distance < closestDistance)) {
                maxVisibleRatio = visibleRatio;
                closestDistance = distance;
                closestPage = i + 1;
              }
            }
          }

          // Use ref to get latest currentPage value to avoid stale closure
          const latestCurrentPage = currentPageRef.current;
          if (closestPage !== latestCurrentPage && closestPage > 0) {
            console.log(
              '📄 Page changed via scroll:',
              closestPage,
              '(visible ratio:',
              maxVisibleRatio.toFixed(2) + ')'
            );
            setCurrentPage(closestPage);
            currentPageRef.current = closestPage;
          }
        }, 150); // Debounce by 150ms
      };

      // Function to observe a page element
      const observePage = (pageIndex: number, pageElement: HTMLElement) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              // Use viewport-based detection (more reliable)
              if (entry.isIntersecting) {
                const newPage = pageIndex + 1;
                const ratio = entry.intersectionRatio;
                const viewportHeight = entry.rootBounds?.height || window.innerHeight;
                const visibleHeight = entry.boundingClientRect.height * ratio;

                // Update if page is significantly visible (at least 30% or more than half viewport height)
                if (ratio > 0.3 || visibleHeight > viewportHeight * 0.5) {
                  // Use ref to get latest currentPage value to avoid stale closure
                  const latestCurrentPage = currentPageRef.current;
                  if (newPage !== latestCurrentPage) {
                    console.log(
                      '📄 Page changed via IntersectionObserver:',
                      newPage,
                      '(ratio:',
                      ratio.toFixed(2),
                      'visible:',
                      visibleHeight.toFixed(0) + 'px)'
                    );
                    setCurrentPage(newPage);
                    currentPageRef.current = newPage;
                  }
                }
              }
            });
          },
          {
            root: null, // Use viewport instead of scroll container (more reliable)
            rootMargin: '-20% 0px -20% 0px', // Consider pages in the center 60% of viewport
            threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
          }
        );

        observer.observe(pageElement);
        observers.push(observer);
      };

      // Use IntersectionObserver as primary method - observe existing pages
      for (let i = 0; i < totalPages; i++) {
        const pageElement = getPageElement(i);
        if (pageElement) {
          observePage(i, pageElement);
        }
      }

      // Set up a MutationObserver to watch for new pages being added (lazy loading)
      mutationObserver = new MutationObserver(() => {
        // Re-check for pages that might have been added
        for (let i = 0; i < totalPages; i++) {
          const pageElement = getPageElement(i);
          if (pageElement) {
            // Simple check: if we have fewer observers than pages, observe this one
            // This is a simplified approach - in production you might want to track which pages are observed
            if (observers.length < totalPages) {
              observePage(i, pageElement);
            }
          }
        }
      });

      // Observe the scroll container for new page elements
      if (scrollContainer) {
        mutationObserver.observe(scrollContainer, {
          childList: true,
          subtree: true,
        });
      }

      // Add scroll listener as backup - try multiple containers
      if (handleScroll) {
        // Attach to the scroll container
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        console.log('✅ Scroll listener attached to:', scrollContainer.className);

        // Also try attaching to the viewer element itself
        const viewerElement = document.querySelector('.rpv-core__viewer');
        if (viewerElement && viewerElement !== scrollContainer) {
          viewerElement.addEventListener('scroll', handleScroll, { passive: true });
          console.log('✅ Scroll listener also attached to .rpv-core__viewer');
        }

        // Also try window scroll as fallback
        window.addEventListener('scroll', handleScroll, { passive: true });
        console.log('✅ Scroll listener also attached to window');

        // Test if scroll is working
        console.log('🧪 Testing scroll detection...');
        setTimeout(() => {
          if (scrollContainer) {
            console.log('🧪 Scroll container scrollTop:', scrollContainer.scrollTop);
            console.log('🧪 Scroll container scrollHeight:', scrollContainer.scrollHeight);
            console.log('🧪 Scroll container clientHeight:', scrollContainer.clientHeight);
          }
          if (handleScroll) {
            handleScroll(); // Trigger initial check
          }
        }, 500);

        // Add polling fallback - check every 500ms for page changes
        pollInterval = setInterval(() => {
          if (scrollContainer && handleScroll) {
            handleScroll();
          }
        }, 500);
        console.log('✅ Polling fallback enabled (checks every 500ms)');
      }
    }, 1500);

    // Cleanup function
    return () => {
      clearTimeout(setupTimeout);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      observers.forEach((observer) => observer.disconnect());
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      if (scrollContainer && handleScroll) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (handleScroll) {
        const viewerElement = document.querySelector('.rpv-core__viewer');
        if (viewerElement) {
          viewerElement.removeEventListener('scroll', handleScroll);
        }
        window.removeEventListener('scroll', handleScroll);
      }
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
      console.log('PDF URL set, waiting for document load:', pdfUrl);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Test URL accessibility
      fetch(pdfUrl, { method: 'HEAD', credentials: 'include' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`PDF URL returned ${response.status}: ${response.statusText}`);
          }
          console.log('PDF URL is accessible, content-type:', response.headers.get('content-type'));
        })
        .catch((err) => {
          console.error('PDF URL accessibility check failed:', err);
        });

      // 60 second timeout
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Apply rotation via CSS
  useEffect(() => {
    if (rotationRef.current) {
      rotationRef.current.style.setProperty('--rotation', `${rotation}deg`);
    }
  }, [rotation]);

  // Save current page to localStorage
  useEffect(() => {
    if (currentPage > 0 && totalPages > 0 && fileName) {
      localStorage.setItem(`pdf-page-${fileName}`, currentPage.toString());
    }
  }, [currentPage, fileName, totalPages]);

  // Handle render errors
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

  // Toolbar handlers - use plugin methods (zoom plugin seems to work)
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 0.25, 3);
    console.log('🔍 Zoom In clicked, new zoom:', newZoom);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    console.log('🔍 Zoom Out clicked, new zoom:', newZoom);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomSliderChange = useCallback(
    (newZoom: number) => {
      console.log('🔍 Zoom slider changed, new zoom:', newZoom);
      setZoom(newZoom);
      zoomTo(newZoom);
    },
    [zoomTo]
  );

  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
  }, [rotation]);

  // Helper function to scroll to a page with retry logic and lazy-loading support
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
        // Special handling for page 1 (index 0) - scroll to very top
        if (pageIndex === 0) {
          scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
          console.log('📍 Scrolled to page 1 (top of document)');
          return true;
        }

        // For other pages, calculate scroll position
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = pageElement.getBoundingClientRect();

        // Calculate the position to center the page in the viewport
        const pageTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        const viewportHeight = containerRect.height;
        const pageHeight = elementRect.height;

        // Center the page in the viewport, with a small offset from top
        const scrollTop = pageTop - (viewportHeight - pageHeight) / 2 - 10;

        scrollContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
        return true;
      } else {
        // Page not in DOM yet (lazy loading) - scroll near it to trigger rendering
        if (retries > 0) {
          console.log(
            `⏳ Page ${
              pageIndex + 1
            } not rendered yet, scrolling near it to trigger lazy loading (${retries} retries left)...`
          );

          // Estimate where the page would be based on average page height
          const allPages = document.querySelectorAll('.rpv-core__page-layer');
          let avgPageHeight = 800; // Default estimate

          if (allPages.length > 0) {
            const totalHeight = Array.from(allPages).reduce((sum, page) => {
              return sum + (page as HTMLElement).offsetHeight;
            }, 0);
            avgPageHeight = totalHeight / allPages.length;
          }

          // Scroll to estimated position to trigger lazy loading
          const containerRect = scrollContainer.getBoundingClientRect();
          const viewportHeight = containerRect.height;
          const estimatedScrollTop = pageIndex * avgPageHeight;
          scrollContainer.scrollTo({
            top: Math.max(0, estimatedScrollTop - viewportHeight / 2),
            behavior: 'smooth',
          });

          // Wait for page to render, then retry
          setTimeout(() => scrollToPage(pageIndex, retries - 1), 400);
        } else {
          console.warn(`❌ Could not find page element for page index ${pageIndex} after all retries`);
        }
        return false;
      }
    },
    [getPageElement, getViewerScrollContainer]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      console.log('⬅️ Jumping to previous page:', currentPage - 1);
      const targetPage = currentPage - 2; // 0-based index
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage - 1);
      }
    }
  }, [currentPage, scrollToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      console.log('➡️ Jumping to next page:', currentPage + 1);
      const targetPage = currentPage; // 0-based index
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage + 1);
      }
    }
  }, [currentPage, totalPages, scrollToPage]);

  const handlePageSelect = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        console.log('🎯 Jumping to page:', page);
        const targetPage = page - 1; // 0-based index
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

  // Handle document load
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

          // Try to restore last page from localStorage
          const savedPage = localStorage.getItem(`pdf-page-${fileName}`);
          if (savedPage) {
            const page = parseInt(savedPage, 10);
            if (page >= 1 && page <= numPages) {
              console.log('📚 Restoring saved page:', page);
              setTimeout(() => {
                jumpToPage(page);
              }, 500); // Wait a bit for viewer to be ready
            } else {
              setCurrentPage(1);
            }
          } else {
            setCurrentPage(1); // Reset to first page
          }
          console.log('📚 PDF loaded successfully, total pages:', numPages);
        }
      } catch (err) {
        console.error('Error processing document load:', err);
        setError('Failed to process PDF document');
      } finally {
        setLoading(false);
      }
    },
    [fileName, jumpToPage]
  );

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
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
                  <PDFViewer
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
