'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type DocumentData = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Document not found');
          } else if (response.status === 401) {
            setError('Unauthorized. Please sign in.');
            router.push('/sign-in');
          } else {
            throw new Error('Failed to fetch document');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setDocument(data.document);

          // Only allow PDF viewing for now
          if (data.document.fileType !== 'pdf') {
            setError('Only PDF files can be viewed in the document viewer. Other file types will be supported soon.');
            return;
          }

          // Use proxy endpoint to avoid CORS issues - convert to absolute URL
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          setPdfUrl(`${baseUrl}/api/documents/${documentId}/view`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, router]);

  console.log('pdfUrl', pdfUrl);
  console.log('document', document);

  const handleDownload = async () => {
    if (!pdfUrl) return;

    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document?.fileName || 'document.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <Card className="p-8 border-destructive/50 bg-destructive/5">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">Error loading document</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!document || !pdfUrl) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No document data available</p>
          </div>
        </Card>
      </div>
    );
  }

  if (document.fileType !== 'pdf') {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <Card className="p-8">
          <div className="text-center">
            <p className="font-medium mb-2">Viewer not available</p>
            <p className="text-sm text-muted-foreground">
              Only PDF files can be viewed in the document viewer. Support for {document.fileType.toUpperCase()} files
              will be added soon.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/documents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{document.fileName}</h1>
            <p className="text-xs text-muted-foreground">
              {document.status === 'completed' ? 'Ready to view' : `Status: ${document.status}`}
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          pdfUrl={pdfUrl}
          fileName={document.fileName}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
