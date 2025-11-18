import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { processDocumentQueue, retryDocumentProcessing } from '@/lib/queue/processor';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/documents/process
 * Process a document (extract text, chunk, generate embeddings, index)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, retry } = body;

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

    // Check if document is already processing
    if (document.status === 'processing') {
      return NextResponse.json({ message: 'Document is already being processed', documentId }, { status: 200 });
    }

    // Check if document is already completed
    if (document.status === 'completed' && !retry) {
      return NextResponse.json({ message: 'Document is already processed', documentId }, { status: 200 });
    }

    // Process document asynchronously
    // Note: In production, you might want to use a proper job queue (Bull, BullMQ, etc.)
    // For now, we'll process it in the background without blocking the response
    if (retry) {
      // Retry processing
      retryDocumentProcessing(documentId).catch((error) => {
        console.error(`Failed to retry processing document ${documentId}:`, error);
      });
    } else {
      // Start processing
      processDocumentQueue(
        documentId,
        session.user.id,
        document.s3Key,
        document.fileType as 'pdf' | 'docx' | 'xlsx'
      ).catch((error) => {
        console.error(`Failed to process document ${documentId}:`, error);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Document processing started',
      documentId,
    });
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/process?documentId=xxx
 * Get processing status of a document
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

    return NextResponse.json({
      documentId: document.id,
      status: document.status,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Get process status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get processing status' },
      { status: 500 }
    );
  }
}
