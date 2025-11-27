'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Entity {
  name: string;
  type: string;
  confidence: number;
  context?: string;
}

export interface EntitiesTableProps {
  documentId: string;
  className?: string;
}

export function EntitiesTable({ documentId, className }: EntitiesTableProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/extract-entities?documentId=${documentId}`);

      if (!response.ok) {
        throw new Error('Failed to extract entities');
      }

      const data = await response.json();
      if (data.success && data.entities) {
        setEntities(data.entities);
      } else {
        throw new Error(data.error || 'Failed to extract entities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [documentId]);

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      person: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      organization: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      location: 'bg-green-500/10 text-green-700 dark:text-green-400',
      date: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      money: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    };
    return colors[type.toLowerCase()] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Key Entities</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchEntities}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {loading && entities.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          <p>{error}</p>
          <Button
            variant="link"
            size="sm"
            onClick={fetchEntities}
            className="p-0 h-auto mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {entities.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((entity, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getEntityTypeColor(entity.type)}
                    >
                      {entity.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{Math.round(entity.confidence * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && entities.length === 0 && (
        <div className="text-sm text-muted-foreground py-4 text-center">No entities found</div>
      )}
    </Card>
  );
}
