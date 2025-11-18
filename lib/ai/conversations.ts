import { db } from '../db';
import { conversations, messages } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Create a new conversation
 * @param userId - User ID
 * @param documentId - Optional document ID
 * @param title - Optional conversation title
 * @returns Created conversation ID
 */
export async function createConversation(userId: string, documentId?: string, title?: string): Promise<string> {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      documentId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
    })
    .returning();

  return conversation.id;
}

/**
 * Add a message to a conversation
 * @param conversationId - Conversation ID
 * @param role - Message role ('user' or 'assistant')
 * @param content - Message content
 * @param sources - Optional source citations
 * @param model - Optional model used for assistant messages
 * @returns Created message ID
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: Array<{ text: string; score: number; metadata: unknown }>,
  model?: string
): Promise<string> {
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      sources: sources ? (sources as unknown) : null,
      model,
    })
    .returning();

  return message.id;
}

/**
 * Get conversation history
 * @param conversationId - Conversation ID
 * @returns Array of messages in chronological order
 */
export async function getConversationHistory(conversationId: string) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

/**
 * Get all conversations for a user
 * @param userId - User ID
 * @param documentId - Optional filter by document ID
 * @returns Array of conversations
 */
export async function getUserConversations(userId: string, documentId?: string) {
  if (documentId) {
    return await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.documentId, documentId)))
      .orderBy(desc(conversations.updatedAt));
  }

  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

/**
 * Update conversation title
 * @param conversationId - Conversation ID
 * @param title - New title
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  await db
    .update(conversations)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}
