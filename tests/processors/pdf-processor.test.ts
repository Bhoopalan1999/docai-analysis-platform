import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPDFFromS3 } from '@/lib/processors/pdf-processor';

// Mock dependencies
vi.mock('@/lib/storage/s3', () => ({
  getFileFromS3: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

describe('PDF Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process PDF and extract text', async () => {
    const mockPdfBuffer = Buffer.from('mock pdf content');
    const mockPdfData = {
      text: 'This is extracted text from PDF',
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
      },
      metadata: {
        CreationDate: '2024-01-01',
      },
      numPages: 5,
    };

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    const pdfParse = (await import('pdf-parse')).default;

    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);
    vi.mocked(pdfParse).mockResolvedValue(mockPdfData as any);

    const result = await processPDFFromS3('test-key.pdf');

    expect(result.text).toBe('This is extracted text from PDF');
    expect(result.pageCount).toBe(5);
    expect(result.metadata).toBeDefined();
    expect(getFileFromS3).toHaveBeenCalledWith('test-key.pdf');
  });

  it('should handle PDF processing errors', async () => {
    const { getFileFromS3 } = await import('@/lib/storage/s3');
    vi.mocked(getFileFromS3).mockRejectedValue(new Error('S3 error'));

    await expect(processPDFFromS3('invalid-key.pdf')).rejects.toThrow();
  });

  it('should handle empty PDF', async () => {
    const mockPdfBuffer = Buffer.from('mock pdf content');
    const mockPdfData = {
      text: '',
      info: {},
      metadata: {},
      numPages: 0,
    };

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    const pdfParse = (await import('pdf-parse')).default;

    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);
    vi.mocked(pdfParse).mockResolvedValue(mockPdfData as any);

    const result = await processPDFFromS3('empty.pdf');

    expect(result.text).toBe('');
    expect(result.pageCount).toBe(0);
  });

  it('should extract metadata correctly', async () => {
    const mockPdfBuffer = Buffer.from('mock pdf content');
    const mockPdfData = {
      text: 'Test content',
      info: {
        Title: 'My Document',
        Author: 'John Doe',
        Subject: 'Test Subject',
      },
      metadata: {
        CreationDate: '2024-01-01T00:00:00Z',
        ModDate: '2024-01-02T00:00:00Z',
      },
      numPages: 10,
    };

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    const pdfParse = (await import('pdf-parse')).default;

    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);
    vi.mocked(pdfParse).mockResolvedValue(mockPdfData as any);

    const result = await processPDFFromS3('test.pdf');

    expect(result.metadata).toBeDefined();
    expect(result.metadata.title).toBe('My Document');
    expect(result.metadata.author).toBe('John Doe');
  });
});
