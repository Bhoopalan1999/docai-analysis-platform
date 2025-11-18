import { db } from '../db';
import { documents } from '../db/schema';
import { processDocument } from '../processors';
import { indexDocumentChunks } from '../ai/rag-pipeline';
import { eq } from 'drizzle-orm';

/**
 * Process a document asynchronously
 * This function handles the full processing pipeline:
 * 1. Extract text from document
 * 2. Chunk the text
 * 3. Generate embeddings
 * 4. Store in vector database
 * 5. Update document status
 *
 * @param documentId - ID of the document to process
 * @param userId - ID of the user who owns the document
 * @param s3Key - S3 key of the document file
 * @param fileType - Type of the document (pdf, docx, xlsx)
 */
export async function processDocumentQueue(
  documentId: string,
  userId: string,
  s3Key: string,
  fileType: 'pdf' | 'docx' | 'xlsx'
): Promise<void> {
  try {
    // Update status to processing
    await db
      .update(documents)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Process the document
    const processingResult = await processDocument(s3Key, fileType);

    // Update document with extracted metadata
    await db
      .update(documents)
      .set({
        status: 'completed',
        metadata: processingResult.metadata,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Chunk and index the document for RAG
    const { chunkDocument } = await import('../ai/chunking');
    const chunks = chunkDocument(processingResult.text);

    // Index chunks in vector database
    await indexDocumentChunks(chunks, documentId, userId, {
      fileName: processingResult.metadata.pdfMetadata?.title || undefined,
      fileType,
    });
  } catch (error) {
    // Update status to error
    await db
      .update(documents)
      .set({
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Re-throw to allow caller to handle
    throw error;
  }
}

/**
 * Retry processing a failed document
 * @param documentId - ID of the document to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 */
export async function retryDocumentProcessing(documentId: string, maxRetries: number = 3): Promise<void> {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (document.status === 'completed') {
    return; // Already completed
  }

  // Check retry count from metadata
  const retryCount = (document.metadata as any)?.retryCount || 0;
  if (retryCount >= maxRetries) {
    throw new Error(`Maximum retry attempts (${maxRetries}) exceeded for document ${documentId}`);
  }

  // Update retry count
  await db
    .update(documents)
    .set({
      metadata: {
        ...((document.metadata as object) || {}),
        retryCount: retryCount + 1,
        lastRetryAt: new Date().toISOString(),
      },
    })
    .where(eq(documents.id, documentId));

  // Retry processing
  await processDocumentQueue(documentId, document.userId, document.s3Key, document.fileType as 'pdf' | 'docx' | 'xlsx');
}
