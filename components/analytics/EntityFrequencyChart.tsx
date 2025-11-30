'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface EntityFrequencyData {
  name: string;
  count: number;
  type: string;
}

export interface EntityFrequencyChartProps {
  data: EntityFrequencyData[];
  className?: string;
}

/**
 * EntityFrequencyChart - Bar chart showing frequency of entities across documents
 */
export function EntityFrequencyChart({ data, className }: EntityFrequencyChartProps) {
  // Group by entity name and sum counts
  const entityMap = new Map<string, { name: string; count: number; type: string }>();

  for (const item of data) {
    const existing = entityMap.get(item.name);
    if (existing) {
      existing.count += item.count;
    } else {
      entityMap.set(item.name, { ...item });
    }
  }

  // Sort by count and take top 10
  const chartData = Array.from(entityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      name: item.name.length > 20 ? `${item.name.substring(0, 20)}...` : item.name,
      fullName: item.name,
      count: item.count,
      type: item.type,
    }));

  // Group by type for stacked bar chart
  const typeMap = new Map<string, Map<string, number>>();
  for (const item of data) {
    if (!typeMap.has(item.type)) {
      typeMap.set(item.type, new Map());
    }
    const typeData = typeMap.get(item.type)!;
    typeData.set(item.name, (typeData.get(item.name) || 0) + item.count);
  }

  // Prepare data for stacked chart by type
  const allEntityNames = Array.from(new Set(data.map((d) => d.name))).slice(0, 10);
  const stackedData = allEntityNames.map((name) => {
    const entry: Record<string, string | number> = {
      name: name.length > 15 ? `${name.substring(0, 15)}...` : name,
      fullName: name,
    };

    for (const [type, entities] of typeMap.entries()) {
      entry[type] = entities.get(name) || 0;
    }

    return entry;
  });

  const hasData = chartData.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Entity Frequency</CardTitle>
        <CardDescription>Most frequently mentioned entities across your documents</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{data.fullName}</p>
                        <p className="text-sm text-muted-foreground">Type: {data.type}</p>
                        <p className="text-sm">Count: {data.count}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                name="Frequency"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No entity data available. Process some documents to see entity frequency.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
