'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type DocumentCardProps = {
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: string;
    createdAt: string;
  };
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return '📄';
    case 'docx':
      return '📝';
    case 'xlsx':
      return '📊';
    default:
      return '📎';
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getFileIcon(document.fileType)}</span>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{document.fileName}</CardTitle>
              <CardDescription className="text-xs">
                {formatFileSize(document.fileSize)} • {document.fileType.toUpperCase()}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Badge variant={getStatusColor(document.status) as any}>{document.status}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1"
          >
            <Link href={`/documents/${document.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
