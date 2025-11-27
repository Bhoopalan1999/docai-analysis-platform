'use client';

import { DocumentUploader } from '@/components/document/DocumentUploader';
import { DocumentList } from '@/components/document/DocumentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export default function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Manage and analyze your documents</p>
      </div>

      <Tabs
        defaultValue="upload"
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="list">My Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <DocumentUploader onUploadComplete={handleUploadComplete} />
        </TabsContent>
        <TabsContent value="list">
          <DocumentList key={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
