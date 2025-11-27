import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { queryDocuments } from '@/lib/ai/rag-pipeline';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/ai/summarize?documentId=xxx
 * Generate a summary of the document
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Verify document belongs to user
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, session.user.id)))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'completed') {
      return NextResponse.json({ error: 'Document is still processing' }, { status: 202 });
    }

    // Generate summary using RAG pipeline
    const summaryPrompt = `Please provide a comprehensive summary of this document. Include:
1. Main topic and purpose
2. Key points and findings
3. Important details or conclusions
4. Any notable insights

Keep the summary concise but informative (2-3 paragraphs).`;

    const ragResult = await queryDocuments(summaryPrompt, {
      documentIds: [documentId],
      userId: session.user.id,
      topK: 10,
      minScore: 0.3,
      modelOptions: {
        strategy: 'fallback',
        temperature: 0.7,
        maxTokens: 500,
      },
    });

    return NextResponse.json({
      success: true,
      summary: ragResult.answer,
      model: ragResult.model,
    });
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      },
      { status: 500 }
    );
  }
}
