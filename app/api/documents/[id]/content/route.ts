import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { processDOCXFromS3 } from '@/lib/processors/docx-processor';
import { processExcelFromS3 } from '@/lib/processors/excel-processor';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/documents/[id]/content
 * Get processed document content (HTML for DOCX, tables for Excel)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch document from database
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only support DOCX and Excel files
    if (document.fileType !== 'docx' && document.fileType !== 'xlsx') {
      return NextResponse.json({ error: 'Content endpoint only supports DOCX and Excel files' }, { status: 400 });
    }

    // Check if document is processed
    if (document.status !== 'completed') {
      return NextResponse.json({ error: 'Document is still processing', status: document.status }, { status: 202 });
    }

    try {
      if (document.fileType === 'docx') {
        // Process DOCX and return HTML
        const result = await processDOCXFromS3(document.s3Key);
        return NextResponse.json({
          success: true,
          html: result.html || result.text,
          metadata: result.metadata,
        });
      } else if (document.fileType === 'xlsx') {
        // Process Excel and return tables
        const result = await processExcelFromS3(document.s3Key);
        return NextResponse.json({
          success: true,
          tables: result.tables,
          metadata: result.metadata,
        });
      }
    } catch (processingError) {
      console.error('Error processing document:', processingError);
      return NextResponse.json(
        {
          error: 'Failed to process document',
          message: processingError instanceof Error ? processingError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  } catch (error) {
    console.error('Get document content error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document content' },
      { status: 500 }
    );
  }
}
