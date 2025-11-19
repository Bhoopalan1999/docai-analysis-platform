import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { getPresignedDownloadUrl } from '@/lib/storage/s3';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/documents/[id]
 * Get document details and presigned URL for viewing
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

    // Generate presigned URL for viewing (valid for 1 hour)
    const presignedUrl = await getPresignedDownloadUrl(document.s3Key, 3600);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      url: presignedUrl,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document' },
      { status: 500 }
    );
  }
}
