import { processPDFFromS3, PDFProcessingResult } from './pdf-processor';
import { processDOCXFromS3, DOCXProcessingResult } from './docx-processor';
import { processExcelFromS3, ExcelProcessingResult } from './excel-processor';

/**
 * Unified document processing result
 */
export interface DocumentProcessingResult {
  text: string;
  fileType: 'pdf' | 'docx' | 'xlsx';
  metadata: {
    // PDF-specific
    pageCount?: number;
    pdfMetadata?: PDFProcessingResult['metadata'];
    // DOCX-specific
    wordCount?: number;
    paragraphCount?: number;
    html?: string;
    // Excel-specific
    sheetCount?: number;
    totalRows?: number;
    totalColumns?: number;
    tables?: ExcelProcessingResult['tables'];
  };
}

/**
 * Process a document based on its file type
 * @param s3Key - S3 key of the document
 * @param fileType - Type of the document (pdf, docx, xlsx)
 * @returns Processing result with extracted text and metadata
 */
export async function processDocument(
  s3Key: string,
  fileType: 'pdf' | 'docx' | 'xlsx'
): Promise<DocumentProcessingResult> {
  try {
    switch (fileType) {
      case 'pdf': {
        const result = await processPDFFromS3(s3Key);
        return {
          text: result.text,
          fileType: 'pdf',
          metadata: {
            pageCount: result.pageCount,
            pdfMetadata: result.metadata,
          },
        };
      }

      case 'docx': {
        const result = await processDOCXFromS3(s3Key);
        return {
          text: result.text,
          fileType: 'docx',
          metadata: {
            wordCount: result.metadata.wordCount,
            paragraphCount: result.metadata.paragraphCount,
            html: result.html,
          },
        };
      }

      case 'xlsx': {
        const result = await processExcelFromS3(s3Key);
        return {
          text: result.text,
          fileType: 'xlsx',
          metadata: {
            sheetCount: result.metadata.sheetCount,
            totalRows: result.metadata.totalRows,
            totalColumns: result.metadata.totalColumns,
            tables: result.tables,
          },
        };
      }

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
    throw new Error('Document processing failed: Unknown error');
  }
}

/**
 * Validate if a file type is supported
 * @param fileType - File type to validate
 * @returns True if supported, false otherwise
 */
export function isSupportedFileType(fileType: string): boolean {
  return ['pdf', 'docx', 'xlsx'].includes(fileType.toLowerCase());
}
