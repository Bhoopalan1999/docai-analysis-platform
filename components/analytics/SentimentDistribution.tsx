'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface SentimentDistributionData {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentDistributionProps {
  data: SentimentDistributionData;
  className?: string;
}

const COLORS = {
  positive: 'hsl(142, 76%, 36%)', // green
  negative: 'hsl(0, 84%, 60%)', // red
  neutral: 'hsl(217, 91%, 60%)', // blue
};

/**
 * SentimentDistribution - Pie chart showing sentiment distribution across documents
 */
export function SentimentDistribution({ data, className }: SentimentDistributionProps) {
  const chartData = [
    { name: 'Positive', value: data.positive, color: COLORS.positive },
    { name: 'Negative', value: data.negative, color: COLORS.negative },
    { name: 'Neutral', value: data.neutral, color: COLORS.neutral },
  ].filter((item) => item.value > 0);

  const total = data.positive + data.negative + data.neutral;
  const hasData = total > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sentiment Distribution</CardTitle>
        <CardDescription>Overall sentiment analysis across your documents</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-4">
            <ResponsiveContainer
              width="100%"
              height={250}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const tooltipData = payload[0];
                      const percentage = total > 0 ? ((tooltipData.value / total) * 100).toFixed(1) : 0;
                      return (
                        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                          <p className="font-semibold">{tooltipData.name}</p>
                          <p className="text-sm">
                            Count: {tooltipData.value} ({percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">{data.positive}</div>
                <div className="text-xs text-muted-foreground">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{data.neutral}</div>
                <div className="text-xs text-muted-foreground">Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-500">{data.negative}</div>
                <div className="text-xs text-muted-foreground">Negative</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>No sentiment data available. Process some documents to see sentiment analysis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
