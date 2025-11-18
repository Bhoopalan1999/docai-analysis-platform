'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  switch (type.toLowerCase()) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'docx':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'xlsx':
      return <FileText className="h-8 w-8 text-green-500" />;
    default:
      return <FileText className="h-8 w-8 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return {
        variant: 'default' as const,
        icon: CheckCircle2,
        className: 'bg-primary/10 text-primary border-primary/20',
      };
    case 'processing':
      return {
        variant: 'secondary' as const,
        icon: Loader2,
        className: 'bg-secondary text-secondary-foreground',
      };
    case 'error':
      return {
        variant: 'destructive' as const,
        icon: XCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      };
    default:
      return {
        variant: 'outline' as const,
        icon: FileText,
        className: '',
      };
  }
};

export function DocumentCard({ document }: DocumentCardProps) {
  const statusConfig = getStatusConfig(document.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="group card-hover border-border/50 hover:border-primary/50 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">{getFileIcon(document.fileType)}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                {document.fileName}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {formatFileSize(document.fileSize)} • {document.fileType.toUpperCase()}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <Badge
            variant={statusConfig.variant}
            className={cn('flex items-center gap-1.5', statusConfig.className)}
          >
            {document.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {document.status === 'completed' && <StatusIcon className="h-3 w-3" />}
            {document.status === 'error' && <StatusIcon className="h-3 w-3" />}
            <span className="capitalize">{document.status}</span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Link href={`/documents/${document.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
