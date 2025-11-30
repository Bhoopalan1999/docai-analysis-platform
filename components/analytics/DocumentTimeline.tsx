'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { FileText, File, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineDocument {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTimelineProps {
  data: TimelineDocument[];
  className?: string;
}

const FILE_TYPE_ICONS = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
};

const STATUS_COLORS = {
  uploaded: 'bg-gray-500',
  processing: 'bg-yellow-500',
  completed: 'bg-green-500',
  error: 'bg-red-500',
};

/**
 * DocumentTimeline - Timeline view of documents
 */
export function DocumentTimeline({ data, className }: DocumentTimelineProps) {
  // Sort by creation date (newest first)
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Group by date
  const groupedByDate = new Map<string, TimelineDocument[]>();
  for (const doc of sortedData) {
    const dateKey = format(parseISO(doc.createdAt), 'yyyy-MM-dd');
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(doc);
  }

  const hasData = sortedData.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Document Timeline</CardTitle>
        <CardDescription>Chronological view of your documents</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-6">
            {Array.from(groupedByDate.entries()).map(([dateKey, docs]) => {
              const date = parseISO(dateKey);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isYesterday = format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

              let dateLabel = format(date, 'MMMM d, yyyy');
              if (isToday) dateLabel = 'Today';
              else if (isYesterday) dateLabel = 'Yesterday';

              return (
                <div
                  key={dateKey}
                  className="relative"
                >
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground px-2">{dateLabel}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Documents for this date */}
                  <div className="space-y-3 pl-4 border-l-2 border-border">
                    {docs.map((doc) => {
                      const Icon = FILE_TYPE_ICONS[doc.fileType as keyof typeof FILE_TYPE_ICONS] || FileText;
                      const statusColor = STATUS_COLORS[doc.status as keyof typeof STATUS_COLORS] || 'bg-gray-500';

                      return (
                        <div
                          key={doc.id}
                          className="flex items-start gap-3 pb-3 last:pb-0"
                        >
                          {/* Timeline dot */}
                          <div className="relative mt-1">
                            <div className={cn('w-2 h-2 rounded-full', statusColor)} />
                            <div className="absolute inset-0 -m-1.5">
                              <div className={cn('w-5 h-5 rounded-full opacity-20', statusColor)} />
                            </div>
                          </div>

                          {/* Document info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">{doc.fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                {doc.fileType.toUpperCase()}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn('text-xs capitalize', statusColor.replace('bg-', 'bg-'))}
                              >
                                {doc.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(doc.createdAt), 'h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No documents yet. Upload your first document to see the timeline.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
