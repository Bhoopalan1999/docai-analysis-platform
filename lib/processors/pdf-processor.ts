import { getFileFromS3 } from '../storage/s3';

// Dynamic import for pdf-parse to handle ESM/CommonJS compatibility
let pdfParseModule: any = null;

async function getPdfParse() {
  if (!pdfParseModule) {
    pdfParseModule = await import('pdf-parse');
  }
  // pdf-parse exports PDFParse as named export, but also has default
  return pdfParseModule.default || pdfParseModule.PDFParse || pdfParseModule;
}

/**
 * PDF processing result
 */
export interface PDFProcessingResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Process a PDF file and extract text content
 * @param fileBuffer - PDF file buffer
 * @returns Processing result with extracted text and metadata
 */
export async function processPDF(fileBuffer: Buffer): Promise<PDFProcessingResult> {
  try {
    const pdfParse = await getPdfParse();
    const pdfData = await pdfParse(fileBuffer);

    return {
      text: pdfData.text,
      pageCount: pdfData.numpages,
      metadata: {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        creator: pdfData.info?.Creator,
        producer: pdfData.info?.Producer,
        creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
        modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
    throw new Error('Failed to process PDF: Unknown error');
  }
}

/**
 * Process a PDF file from S3
 * @param s3Key - S3 key of the PDF file
 * @returns Processing result with extracted text and metadata
 */
export async function processPDFFromS3(s3Key: string): Promise<PDFProcessingResult> {
  const fileBuffer = await getFileFromS3(s3Key);
  return processPDF(fileBuffer);
}
