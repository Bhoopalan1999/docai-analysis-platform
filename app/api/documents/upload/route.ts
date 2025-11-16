import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { uploadFileToS3, generateS3Key } from '@/lib/storage/s3';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOCX, and XLSX are supported' }, { status: 400 });
    }

    // Validate file size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Generate S3 key
    const s3Key = generateS3Key(session.user.id, file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    await uploadFileToS3(s3Key, buffer, file.type);

    // Determine file type
    let fileType = 'pdf';
    if (file.type.includes('wordprocessingml')) fileType = 'docx';
    if (file.type.includes('spreadsheetml')) fileType = 'xlsx';

    // Save document metadata to database
    const [document] = await db
      .insert(documents)
      .values({
        userId: session.user.id,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        s3Key,
        status: 'uploaded',
      })
      .returning();

    return NextResponse.json({
      success: true,
      documentId: document.id,
      document,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
