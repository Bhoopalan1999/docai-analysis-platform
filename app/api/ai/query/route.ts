import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { queryDocuments } from '@/lib/ai/rag-pipeline';
import { createConversation, addMessage, getConversationHistory } from '@/lib/ai/conversations';
import { db } from '@/lib/db';
import { documents, conversations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/ai/query
 * Query documents using RAG pipeline with multi-model support
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, documentIds, conversationId, modelStrategy, preferredModel, minScore, topK } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required and must be a non-empty string' }, { status: 400 });
    }

    // Validate document IDs if provided
    if (documentIds && Array.isArray(documentIds)) {
      for (const docId of documentIds) {
        const [document] = await db
          .select()
          .from(documents)
          .where(and(eq(documents.id, docId), eq(documents.userId, session.user.id)))
          .limit(1);

        if (!document) {
          return NextResponse.json({ error: `Document ${docId} not found or access denied` }, { status: 404 });
        }
      }
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      currentConversationId = await createConversation(
        session.user.id,
        documentIds && documentIds.length > 0 ? documentIds[0] : undefined,
        query.substring(0, 100) // Use query as initial title
      );
    }

    // Add user message to conversation
    await addMessage(currentConversationId, 'user', query);

    // Execute RAG query
    const ragResult = await queryDocuments(query, {
      documentIds,
      userId: session.user.id,
      topK: topK || 5,
      minScore: minScore || 0.3,
      modelOptions: {
        strategy: modelStrategy || 'fallback',
        preferredModel: preferredModel,
        temperature: 0.7,
        maxTokens: 2000,
      },
    });

    // Add assistant response to conversation
    await addMessage(currentConversationId, 'assistant', ragResult.answer, ragResult.sources, ragResult.model);

    return NextResponse.json({
      success: true,
      answer: ragResult.answer,
      sources: ragResult.sources,
      conversationId: currentConversationId,
      model: ragResult.model,
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process query',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/query?conversationId=xxx
 * Get conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Verify conversation belongs to user
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get conversation history
    const history = await getConversationHistory(conversationId);

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        documentId: conversation.documentId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: history,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get conversation',
      },
      { status: 500 }
    );
  }
}
