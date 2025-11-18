import mammoth from 'mammoth';
import { getFileFromS3 } from '../storage/s3';

/**
 * DOCX processing result
 */
export interface DOCXProcessingResult {
  text: string;
  html?: string; // Preserved formatting as HTML
  metadata: {
    wordCount?: number;
    paragraphCount?: number;
  };
}

/**
 * Process a DOCX file and extract text content
 * @param fileBuffer - DOCX file buffer
 * @returns Processing result with extracted text and HTML
 */
export async function processDOCX(fileBuffer: Buffer): Promise<DOCXProcessingResult> {
  try {
    // Extract text content
    const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = textResult.value;

    // Extract HTML with formatting preserved
    const htmlResult = await mammoth.convertToHtml({ buffer: fileBuffer });
    const html = htmlResult.value;

    // Count paragraphs (split by double newlines)
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

    return {
      text,
      html,
      metadata: {
        wordCount,
        paragraphCount: paragraphs.length,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process DOCX: ${error.message}`);
    }
    throw new Error('Failed to process DOCX: Unknown error');
  }
}

/**
 * Process a DOCX file from S3
 * @param s3Key - S3 key of the DOCX file
 * @returns Processing result with extracted text and HTML
 */
export async function processDOCXFromS3(s3Key: string): Promise<DOCXProcessingResult> {
  const fileBuffer = await getFileFromS3(s3Key);
  return processDOCX(fileBuffer);
}
