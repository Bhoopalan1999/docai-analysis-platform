import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDocument } from '@/lib/processors';

// Mock processors
vi.mock('@/lib/processors/pdf-processor', () => ({
  processPDFFromS3: vi.fn(),
}));

vi.mock('@/lib/processors/docx-processor', () => ({
  processDOCXFromS3: vi.fn(),
}));

vi.mock('@/lib/processors/excel-processor', () => ({
  processExcelFromS3: vi.fn(),
}));

describe('Document Upload Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processDocument', () => {
    it('should process PDF documents', async () => {
      const mockResult = {
        text: 'PDF content',
        pageCount: 5,
        metadata: { title: 'Test PDF' },
      };

      const { processPDFFromS3 } = await import('@/lib/processors/pdf-processor');
      vi.mocked(processPDFFromS3).mockResolvedValue(mockResult);

      const result = await processDocument('test-key.pdf', 'pdf');

      expect(result.fileType).toBe('pdf');
      expect(result.text).toBe('PDF content');
      expect(result.metadata.pageCount).toBe(5);
      expect(processPDFFromS3).toHaveBeenCalledWith('test-key.pdf');
    });

    it('should process DOCX documents', async () => {
      const mockResult = {
        text: 'DOCX content',
        html: '<p>DOCX content</p>',
        metadata: {
          wordCount: 100,
          paragraphCount: 5,
        },
      };

      const { processDOCXFromS3 } = await import('@/lib/processors/docx-processor');
      vi.mocked(processDOCXFromS3).mockResolvedValue(mockResult);

      const result = await processDocument('test-key.docx', 'docx');

      expect(result.fileType).toBe('docx');
      expect(result.text).toBe('DOCX content');
      expect(result.metadata.html).toBe('<p>DOCX content</p>');
      expect(result.metadata.wordCount).toBe(100);
      expect(processDOCXFromS3).toHaveBeenCalledWith('test-key.docx');
    });

    it('should process Excel documents', async () => {
      const mockResult = {
        text: 'Excel content',
        tables: [
          {
            sheetName: 'Sheet1',
            headers: ['Column1', 'Column2'],
            rows: [['Value1', 'Value2']],
            rowCount: 1,
            columnCount: 2,
          },
        ],
        metadata: {
          sheetCount: 1,
          totalRows: 1,
          totalColumns: 2,
        },
      };

      const { processExcelFromS3 } = await import('@/lib/processors/excel-processor');
      vi.mocked(processExcelFromS3).mockResolvedValue(mockResult);

      const result = await processDocument('test-key.xlsx', 'xlsx');

      expect(result.fileType).toBe('xlsx');
      expect(result.text).toBe('Excel content');
      expect(result.metadata.sheetCount).toBe(1);
      expect(result.metadata.tables).toBeDefined();
      expect(processExcelFromS3).toHaveBeenCalledWith('test-key.xlsx');
    });

    it('should throw error for unsupported file type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(processDocument('test-key.txt', 'txt' as any)).rejects.toThrow('Unsupported file type');
    });

    it('should handle processing errors gracefully', async () => {
      const { processPDFFromS3 } = await import('@/lib/processors/pdf-processor');
      vi.mocked(processPDFFromS3).mockRejectedValue(new Error('Processing failed'));

      await expect(processDocument('test-key.pdf', 'pdf')).rejects.toThrow('Document processing failed');
    });
  });

  describe('File Type Validation', () => {
    it('should validate supported file types', async () => {
      const { isSupportedFileType } = await import('@/lib/processors');

      expect(isSupportedFileType('pdf')).toBe(true);
      expect(isSupportedFileType('docx')).toBe(true);
      expect(isSupportedFileType('xlsx')).toBe(true);
      expect(isSupportedFileType('PDF')).toBe(true);
      expect(isSupportedFileType('DOCX')).toBe(true);
      expect(isSupportedFileType('txt')).toBe(false);
      expect(isSupportedFileType('jpg')).toBe(false);
    });
  });
});
