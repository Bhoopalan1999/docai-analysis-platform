'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

interface BatchProcessorProps {
  onUploadComplete?: () => void;
  className?: string;
}

/**
 * BatchProcessor - Upload and process multiple documents at once
 */
export function BatchProcessor({ onUploadComplete, className }: BatchProcessorProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithStatus[] = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileWithStatus: FileWithStatus, index: number): Promise<void> => {
    const formData = new FormData();
    formData.append('file', fileWithStatus.file);

    // Update status to uploading
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'uploading', progress: 0 };
      return updated;
    });

    try {
      // Upload file
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.success || !uploadData.documentId) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      // Update progress
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'uploading',
          progress: 50,
          documentId: uploadData.documentId,
        };
        return updated;
      });

      // Start processing
      const processResponse = await fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: uploadData.documentId,
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Processing failed');
      }

      // Update to success
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'success',
          progress: 100,
        };
        return updated;
      });
    } catch (error) {
      // Update to error
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        return updated;
      });
    }
  };

  const processAll = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const pendingFiles = files.map((f, i) => ({ file: f, index: i })).filter(({ file }) => file.status === 'pending');

    // Process files sequentially to avoid overwhelming the server
    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }

    setIsProcessing(false);
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  // uploadingCount kept for potential future use

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Batch Document Upload</CardTitle>
          <CardDescription>Upload and process multiple documents at once</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-xs text-muted-foreground">Supports PDF, DOCX, XLSX (max 50MB per file)</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Files ({files.length}) - {successCount} completed, {errorCount} failed
                </h3>
                <Button
                  onClick={processAll}
                  disabled={isProcessing || pendingCount === 0}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Process All ({pendingCount})
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((fileWithStatus, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{fileWithStatus.file.name}</p>
                        <Badge
                          variant={
                            fileWithStatus.status === 'success'
                              ? 'default'
                              : fileWithStatus.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {fileWithStatus.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatFileSize(fileWithStatus.file.size)}</p>
                      {fileWithStatus.status === 'uploading' && (
                        <Progress
                          value={fileWithStatus.progress}
                          className="mt-2 h-1"
                        />
                      )}
                      {fileWithStatus.status === 'error' && fileWithStatus.error && (
                        <p className="text-xs text-destructive mt-1">{fileWithStatus.error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {fileWithStatus.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {fileWithStatus.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                      {fileWithStatus.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
