import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { getFileFromS3 } from '@/lib/storage/s3';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/documents/[id]/view
 * Proxy endpoint to serve PDF files with proper CORS headers
 * This bypasses CORS issues when loading PDFs from S3
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

    // Only serve PDFs through this endpoint
    if (document.fileType !== 'pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Fetch file from S3
    const fileBuffer = await getFileFromS3(document.s3Key);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    // Return PDF with proper headers
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Get document view error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document' },
      { status: 500 }
    );
  }
}
