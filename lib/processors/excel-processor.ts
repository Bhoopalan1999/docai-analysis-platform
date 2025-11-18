import * as XLSX from 'xlsx';
import { getFileFromS3 } from '../storage/s3';

/**
 * Excel table structure
 */
export interface ExcelTable {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  columnCount: number;
}

/**
 * Excel processing result
 */
export interface ExcelProcessingResult {
  text: string; // Flattened text representation
  tables: ExcelTable[];
  metadata: {
    sheetCount: number;
    totalRows: number;
    totalColumns: number;
  };
}

/**
 * Process an Excel file and extract tables
 * @param fileBuffer - Excel file buffer
 * @returns Processing result with extracted tables and text
 */
export async function processExcel(fileBuffer: Buffer): Promise<ExcelProcessingResult> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const tables: ExcelTable[] = [];
    let totalRows = 0;
    let totalColumns = 0;

    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false, // Convert all values to strings for consistency
      }) as (string | number | boolean | null)[][];

      if (jsonData.length === 0) {
        return; // Skip empty sheets
      }

      // First row is headers
      const headers = (jsonData[0] || []).map((cell) => String(cell || ''));
      const rows = jsonData.slice(1);

      tables.push({
        sheetName,
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length,
      });

      totalRows += rows.length;
      totalColumns = Math.max(totalColumns, headers.length);
    });

    // Generate flattened text representation
    const textParts: string[] = [];
    tables.forEach((table) => {
      textParts.push(`Sheet: ${table.sheetName}`);
      textParts.push(`Headers: ${table.headers.join(', ')}`);
      table.rows.forEach((row, index) => {
        const rowText = row.map((cell) => String(cell || '')).join(' | ');
        textParts.push(`Row ${index + 1}: ${rowText}`);
      });
      textParts.push(''); // Empty line between sheets
    });

    return {
      text: textParts.join('\n'),
      tables,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        totalRows,
        totalColumns,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
    throw new Error('Failed to process Excel file: Unknown error');
  }
}

/**
 * Process an Excel file from S3
 * @param s3Key - S3 key of the Excel file
 * @returns Processing result with extracted tables and text
 */
export async function processExcelFromS3(s3Key: string): Promise<ExcelProcessingResult> {
  const fileBuffer = await getFileFromS3(s3Key);
  return processExcel(fileBuffer);
}
