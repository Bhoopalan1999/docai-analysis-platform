'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { EntityFrequencyChart } from './EntityFrequencyChart';
import { SentimentDistribution } from './SentimentDistribution';
import { DocumentTimeline } from './DocumentTimeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface AnalyticsData {
  documentStats: {
    total: number;
    byType: {
      pdf: number;
      docx: number;
      xlsx: number;
    };
    byStatus: {
      uploaded: number;
      processing: number;
      completed: number;
      error: number;
    };
  };
  usageStats: {
    totalCost: number;
    totalActions: number;
    costByAction: Array<{ action: string; cost: number; count: number }>;
    costByModel?: Array<{ model: string; cost: number; count: number }>;
  };
  timelineData: Array<{
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  entityFrequency: Array<{ name: string; count: number; type: string }>;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface InsightsDashboardProps {
  className?: string;
}

/**
 * InsightsDashboard - Main analytics dashboard component
 */
export function InsightsDashboard({ className }: InsightsDashboardProps) {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: AnalyticsData }>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analytics = data?.data;
  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format cost in dollars
  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className={className}>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.documentStats.total}</div>
            <p className="text-xs text-muted-foreground">{analytics.documentStats.byStatus.completed} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(analytics.usageStats.totalCost)}</div>
            <p className="text-xs text-muted-foreground">{analytics.usageStats.totalActions} API calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.documentStats.byStatus.processing}</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.documentStats.total > 0
                ? Math.round((analytics.documentStats.byStatus.completed / analytics.documentStats.total) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.documentStats.byStatus.completed} of {analytics.documentStats.total} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <EntityFrequencyChart data={analytics.entityFrequency} />
        <SentimentDistribution data={analytics.sentimentDistribution} />
      </div>

      {/* Document Timeline */}
      <DocumentTimeline data={analytics.timelineData} />

      {/* Cost Breakdown (if available) */}
      {analytics.usageStats.costByAction.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>API usage costs by action type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.usageStats.costByAction.map((item) => (
                <div
                  key={item.action}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">{item.action}</p>
                    <p className="text-sm text-muted-foreground">{item.count} actions</p>
                  </div>
                  <p className="font-semibold">{formatCost(item.cost)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
