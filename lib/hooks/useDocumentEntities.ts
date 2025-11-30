import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Entity {
  name: string;
  type: string;
  confidence: number;
  context?: string;
}

interface EntitiesResponse {
  success: boolean;
  entities?: Entity[];
  error?: string;
}

/**
 * Custom React Query hook for fetching document entities
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Stale-while-revalidate pattern
 * - Automatic retry on failure
 *
 * @param documentId - The document ID to fetch entities for
 * @param options - Optional query options
 */
export function useDocumentEntities(
  documentId: string | undefined,
  options?: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  }
) {
  // const queryClient = useQueryClient();

  return useQuery<EntitiesResponse>({
    queryKey: ['document-entities', documentId],
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const response = await fetch(`/api/ai/extract-entities?documentId=${documentId}`);

      if (!response.ok) {
        throw new Error('Failed to extract entities');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract entities');
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
 * Helper function to invalidate entities cache
 */
export function useInvalidateEntities() {
  const queryClient = useQueryClient();

  return (documentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['document-entities', documentId] });
  };
}
