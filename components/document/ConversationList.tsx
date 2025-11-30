'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, MessageSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations, useDeleteConversation } from '@/lib/hooks/useConversations';
import { useCollapseState } from '@/lib/hooks/useCollapseState';
import { toast } from 'sonner';

interface ConversationListProps {
  documentId: string;
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  className?: string;
}

export function ConversationList({
  documentId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  className,
}: ConversationListProps) {
  // Use reusable collapse hook
  const [isCollapsed, toggleCollapse] = useCollapseState('conversation-list-collapsed', false);

  // Use React Query to fetch conversations
  const { data, isLoading, error } = useConversations(documentId);
  const deleteConversation = useDeleteConversation();

  const conversations = data?.conversations || [];

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await deleteConversation.mutateAsync(conversationId);
      toast.success('Conversation deleted');

      // If we deleted the current conversation, switch to new one
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete conversation');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r border-border bg-muted/30 max-h-[calc(100%-60px)] transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        {!isCollapsed && (
          <Button
            onClick={onNewConversation}
            size="sm"
            className="flex-1 cursor-pointer hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        )}
        {isCollapsed && (
          <Button
            onClick={onNewConversation}
            size="sm"
            variant="ghost"
            className="w-full p-2 cursor-pointer hover:bg-muted"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className={cn('p-1.5 shrink-0 cursor-pointer', isCollapsed ? 'ml-auto' : 'ml-2')}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Conversations List */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && <div className="text-xs text-destructive p-2 text-center">Failed to load conversations</div>}

            {!isLoading && !error && conversations.length === 0 && (
              <div className="text-xs text-muted-foreground p-4 text-center">
                No conversations yet. Start a new chat!
              </div>
            )}

            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                  'hover:bg-muted',
                  currentConversationId === conv.id && 'bg-muted border border-border'
                )}
                onClick={() => onSelectConversation(conv.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm truncate text-foreground">
                  {conv.title.slice(0, 22) + (conv.title.length > 22 ? '...' : '') || 'Untitled Conversation'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    'hover:bg-destructive/10 hover:text-destructive'
                  )}
                  onClick={(e) => handleDelete(conv.id, e)}
                  disabled={deleteConversation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Collapsed View - Show only icons */}
      {isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {conversations.map((conv) => (
              <Button
                key={conv.id}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full p-2 h-auto flex flex-col items-center justify-center gap-1 cursor-pointer',
                  'hover:bg-muted transition-colors',
                  currentConversationId === conv.id && 'bg-muted border border-border'
                )}
                onClick={() => onSelectConversation(conv.id)}
                title={conv.title || 'Untitled Conversation'}
              >
                <MessageSquare
                  className={cn(
                    'h-4 w-4',
                    currentConversationId === conv.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer with conversation count */}
      {!isCollapsed && conversations.length > 0 && (
        <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </div>
      )}

      {/* Collapsed footer - show count as tooltip */}
      {isCollapsed && conversations.length > 0 && (
        <div className="p-2 border-t border-border">
          <div
            className="text-xs text-muted-foreground text-center"
            title={`${conversations.length} ${conversations.length === 1 ? 'conversation' : 'conversations'}`}
          >
            {conversations.length}
          </div>
        </div>
      )}
    </div>
  );
}
