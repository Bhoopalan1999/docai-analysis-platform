import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Conversation {
  id: string;
  title: string;
  documentId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
  error?: string;
}

/**
 * Custom React Query hook for fetching conversations
 *
 * Features:
 * - Automatic caching
 * - Refetch on mount
 * - Optimistic updates
 *
 * @param documentId - Optional document ID to filter conversations
 */
export function useConversations(documentId?: string) {
  return useQuery<ConversationsResponse>({
    queryKey: ['conversations', documentId],
    queryFn: async () => {
      const url = documentId ? `/api/conversations?documentId=${documentId}` : '/api/conversations';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      return data;
    },
    staleTime: 30 * 1000, // 30 seconds - conversations list changes more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Custom React Query hook for deleting a conversation
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete conversation');
      }

      return response.json();
    },
    onSuccess: (_, conversationId) => {
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Also invalidate conversation history if it was being viewed
      queryClient.invalidateQueries({ queryKey: ['conversation-history', conversationId] });
    },
  });
}
