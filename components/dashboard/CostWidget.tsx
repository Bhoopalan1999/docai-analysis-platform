'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';

interface UsageStats {
  totalCost: number;
  totalActions: number;
  costByAction: Array<{ action: string; cost: number; count: number }>;
  costByModel?: Array<{ model: string; cost: number; count: number }>;
}

interface CostWidgetProps {
  className?: string;
  period?: 'day' | 'week' | 'month' | 'all';
}

/**
 * CostWidget - Display cost tracking widget for dashboard
 */
export function CostWidget({ className, period = 'all' }: CostWidgetProps) {
  const { data, isLoading } = useQuery<{ success: boolean; data: { usageStats: UsageStats } }>({
    queryKey: ['analytics', 'cost', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date | undefined;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = undefined;
      }

      const params = new URLSearchParams();
      if (startDate) {
        params.set('startDate', startDate.toISOString());
      }
      params.set('endDate', now.toISOString());

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cost data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const usageStats = data?.data?.usageStats;
  if (!usageStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cost Tracking</CardTitle>
          <CardDescription>API usage costs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No cost data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalCost = usageStats.totalCost;
  const totalActions = usageStats.totalActions;
  const avgCostPerAction = totalActions > 0 ? totalCost / totalActions : 0;

  // Get top cost action
  const topCostAction = usageStats.costByAction.sort((a, b) => b.cost - a.cost).find((item) => item.cost > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Cost Tracking
        </CardTitle>
        <CardDescription>{period === 'all' ? 'All time' : `Last ${period}`} API usage costs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold">{formatCost(totalCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalActions} total actions</p>
          </div>

          {avgCostPerAction > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg per action</span>
                <span className="font-medium">{formatCost(Math.round(avgCostPerAction))}</span>
              </div>
            </div>
          )}

          {topCostAction && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Top cost: {topCostAction.action}</span>
                <span className="font-medium">{formatCost(topCostAction.cost)}</span>
              </div>
            </div>
          )}

          {usageStats.costByModel && usageStats.costByModel.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">By Model:</p>
              <div className="space-y-1">
                {usageStats.costByModel
                  .sort((a, b) => b.cost - a.cost)
                  .slice(0, 3)
                  .map((item) => (
                    <div
                      key={item.model}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="capitalize">{item.model}</span>
                      <span className="font-medium">{formatCost(item.cost)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
