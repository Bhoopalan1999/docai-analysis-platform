import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * Custom React Query hook for fetching document summary
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Stale-while-revalidate pattern
 * - Automatic retry on failure
 * - Optimistic updates
 *
 * @param documentId - The document ID to fetch summary for
 * @param options - Optional query options
 */
export function useDocumentSummary(
  documentId: string | undefined,
  options?: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  }
) {
  // const queryClient = useQueryClient();

  return useQuery<SummaryResponse>({
    queryKey: ['document-summary', documentId],
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const response = await fetch(`/api/ai/summarize?documentId=${documentId}`);

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      return data;
    },
    enabled: options?.enabled !== false && !!documentId,
    // Stale time: data is fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache time: keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry once on failure
    retry: 1,
    // Don't refetch on window focus (save API calls)
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? false,
  });
}

/**
 * Helper function to invalidate summary cache
 * Useful when you want to force a refetch
 */
export function useInvalidateSummary() {
  const queryClient = useQueryClient();

  return (documentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['document-summary', documentId] });
  };
}
