'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FileWithProgress = {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
};

type DocumentUploaderProps = {
  onUploadComplete?: (fileId: string) => void;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithProgress[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    // Start uploading each file
    newFiles.forEach((fileWithProgress) => {
      uploadFile(fileWithProgress.file);
    });
  }, []);

  const uploadFile = async (file: File) => {
    const fileIndex = files.findIndex((f) => f.file === file);

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: 'error',
          error: 'File size exceeds 50MB limit',
        };
        return updated;
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: 'error',
          error: 'Invalid file type. Only PDF, DOCX, and XLSX are supported',
        };
        return updated;
      });
      return;
    }

    // Update status to uploading
    setFiles((prev) => {
      const updated = [...prev];
      updated[fileIndex] = {
        ...updated[fileIndex],
        status: 'uploading',
      };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Update status to completed
      setFiles((prev) => {
        const updated = [...prev];
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: 'completed',
          progress: 100,
        };
        return updated;
      });

      if (onUploadComplete) {
        onUploadComplete(data.documentId);
      }
    } catch (error) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        return updated;
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('wordprocessingml')) return '📝';
    if (type.includes('spreadsheetml')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">{isDragActive ? 'Drop files here' : 'Drag and drop files here'}</p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <p className="text-xs text-muted-foreground">Supports PDF, DOCX, XLSX (Max 50MB)</p>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <Card
              key={index}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(fileWithProgress.file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileWithProgress.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(fileWithProgress.file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {fileWithProgress.status === 'uploading' && (
                <div className="space-y-1">
                  <Progress value={fileWithProgress.progress} />
                  <p className="text-xs text-muted-foreground">Uploading... {fileWithProgress.progress}%</p>
                </div>
              )}

              {fileWithProgress.status === 'completed' && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Upload complete</span>
                </div>
              )}

              {fileWithProgress.status === 'error' && (
                <p className="text-sm text-destructive">{fileWithProgress.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
