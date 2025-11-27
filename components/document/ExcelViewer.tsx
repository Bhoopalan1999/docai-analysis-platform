'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, ArrowUpDown } from 'lucide-react';

export interface ExcelViewerProps {
  documentId: string;
  fileName: string;
  onDownload?: () => void;
  className?: string;
}

interface ExcelTable {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  columnCount: number;
}

export function ExcelViewer({ documentId, fileName, onDownload, className }: ExcelViewerProps) {
  const [tables, setTables] = useState<ExcelTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ column: number; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/content`);

        if (!response.ok) {
          throw new Error('Failed to fetch document content');
        }

        const data = await response.json();
        if (data.success && data.tables && Array.isArray(data.tables)) {
          setTables(data.tables);
          if (data.tables.length > 0) {
            setActiveSheet(data.tables[0].sheetName);
          }
        } else {
          throw new Error('No table data available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [documentId]);

  const handleSort = (columnIndex: number) => {
    setSortConfig((prev) => {
      if (prev?.column === columnIndex) {
        return { column: columnIndex, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column: columnIndex, direction: 'asc' };
    });
  };

  const handleExportCSV = () => {
    const activeTable = tables.find((t) => t.sheetName === activeSheet);
    if (!activeTable) return;

    // Create CSV content
    const csvRows: string[] = [];
    csvRows.push(activeTable.headers.map((h) => `"${h}"`).join(','));
    activeTable.rows.forEach((row) => {
      csvRows.push(row.map((cell) => `"${String(cell || '')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.replace(/\.[^/.]+$/, '')}_${activeSheet}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.open(`/api/documents/${documentId}/download`, '_blank');
    }
  };

  const getSortedRows = (table: ExcelTable) => {
    if (!sortConfig) return table.rows;

    const sorted = [...table.rows].sort((a, b) => {
      const aVal = String(a[sortConfig.column] || '');
      const bVal = String(b[sortConfig.column] || '');

      if (sortConfig.direction === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });

    return sorted;
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <p className="text-destructive font-medium mb-2">Failed to load document</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  const activeTable = tables.find((t) => t.sheetName === activeSheet);
  if (!activeTable) return null;

  const displayRows = getSortedRows(activeTable);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <div className="text-xs text-muted-foreground">
          {activeTable.rowCount} rows × {activeTable.columnCount} columns
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeSheet}
          onValueChange={setActiveSheet}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-2 mt-2">
            {tables.map((table) => (
              <TabsTrigger
                key={table.sheetName}
                value={table.sheetName}
              >
                {table.sheetName}
              </TabsTrigger>
            ))}
          </TabsList>

          {tables.map((table) => (
            <TabsContent
              key={table.sheetName}
              value={table.sheetName}
              className="flex-1 overflow-hidden m-0"
            >
              <ScrollArea className="h-full">
                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.headers.map((header, index) => (
                          <TableHead
                            key={index}
                            className="sticky top-0 bg-background z-10"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                              onClick={() => handleSort(index)}
                            >
                              {header}
                              {sortConfig?.column === index && <ArrowUpDown className="h-3 w-3 ml-1" />}
                            </Button>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell
                              key={cellIndex}
                              className="whitespace-nowrap"
                            >
                              {String(cell ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
