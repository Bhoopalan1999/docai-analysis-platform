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
          'border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 group',
          isDragActive
            ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
            : 'border-border/50 hover:border-primary/50 hover:bg-accent/50 hover:shadow-md'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'p-4 rounded-full mb-4 transition-all duration-300',
              isDragActive ? 'bg-primary/20 scale-110' : 'bg-primary/10 group-hover:bg-primary/20'
            )}
          >
            <Upload
              className={cn(
                'h-8 w-8 transition-all duration-300',
                isDragActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary'
              )}
            />
          </div>
          <p className="text-lg font-semibold mb-2">{isDragActive ? 'Drop files here' : 'Drag and drop files here'}</p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full inline-block">
            Supports PDF, DOCX, XLSX (Max 50MB)
          </p>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileWithProgress, index) => (
            <Card
              key={index}
              className="p-4 border-border/50 hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{getFileIcon(fileWithProgress.file.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileWithProgress.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(fileWithProgress.file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {fileWithProgress.status === 'uploading' && (
                <div className="space-y-2">
                  <Progress
                    value={fileWithProgress.progress}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                    <p className="text-xs font-medium text-primary">{fileWithProgress.progress}%</p>
                  </div>
                </div>
              )}

              {fileWithProgress.status === 'completed' && (
                <div className="flex items-center space-x-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Upload complete</span>
                </div>
              )}

              {fileWithProgress.status === 'error' && (
                <div className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <X className="h-4 w-4" />
                  <span>{fileWithProgress.error}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
