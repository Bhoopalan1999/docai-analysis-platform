import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SentimentData {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1
  confidence: number; // 0-1
}

interface SentimentResponse {
  success: boolean;
  sentiment?: SentimentData;
  error?: string;
}

/**
 * Custom React Query hook for fetching document sentiment
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Stale-while-revalidate pattern
 * - Automatic retry on failure
 *
 * @param documentId - The document ID to fetch sentiment for
 * @param options - Optional query options
 */
export function useDocumentSentiment(
  documentId: string | undefined,
  options?: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  }
) {
  // const queryClient = useQueryClient();

  return useQuery<SentimentResponse>({
    queryKey: ['document-sentiment', documentId],
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const response = await fetch(`/api/ai/sentiment?documentId=${documentId}`);

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze sentiment');
      }

      return data;
    },
    enabled: options?.enabled !== false && !!documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? false,
  });
}

/**
 * Helper function to invalidate sentiment cache
 */
export function useInvalidateSentiment() {
  const queryClient = useQueryClient();

  return (documentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['document-sentiment', documentId] });
  };
}
