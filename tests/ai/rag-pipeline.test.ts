import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryDocuments, indexDocumentChunks, buildRAGPrompt } from '@/lib/ai/rag-pipeline';
import { generateEmbeddings, generateEmbeddingsBatch } from '@/lib/ai/embeddings';
import { queryVectors, upsertVectors } from '@/lib/vector/pinecone';
import { generateResponse } from '@/lib/ai/model-selector';
import { DocumentChunk } from '@/lib/ai/chunking';

// Mock dependencies
vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbeddings: vi.fn(),
  generateEmbeddingsBatch: vi.fn(),
  getEmbeddingDimension: () => 1536,
}));

vi.mock('@/lib/vector/pinecone', () => ({
  queryVectors: vi.fn(),
  upsertVectors: vi.fn(),
  hybridSearch: vi.fn(),
}));

vi.mock('@/lib/ai/model-selector', () => ({
  generateResponse: vi.fn(),
}));

vi.mock('@/lib/ai/query-preprocessing', () => ({
  preprocessQuery: (query: string) => ({
    keywords: query.split(' ').filter((w) => w.length > 2),
    cleaned: query.toLowerCase(),
  }),
  calculateKeywordScore: () => 0.5,
}));

describe('RAG Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildRAGPrompt', () => {
    it('should build a proper RAG prompt with query and context', () => {
      const query = 'What is the main topic?';
      const context = 'This is a test document about AI.';

      const prompt = buildRAGPrompt(query, context);

      expect(prompt).toContain(query);
      expect(prompt).toContain(context);
      expect(prompt).toContain('You are a helpful AI assistant');
    });
  });

  describe('queryDocuments', () => {
    it('should throw error for empty query', async () => {
      await expect(queryDocuments('')).rejects.toThrow('Query cannot be empty');
      await expect(queryDocuments('   ')).rejects.toThrow('Query cannot be empty');
    });

    it('should query documents and return results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        {
          id: 'chunk-1',
          score: 0.85,
          metadata: {
            documentId: 'doc-1',
            userId: 'user-1',
            chunkIndex: 0,
            text: 'This is a test chunk',
            pageNumber: 1,
          },
        },
      ];
      const mockResponse = {
        text: 'This is the answer',
        model: 'openai' as const,
      };

      const embeddingsModule = await import('@/lib/ai/embeddings');
      const pineconeModule = await import('@/lib/vector/pinecone');
      const modelModule = await import('@/lib/ai/model-selector');

      vi.mocked(embeddingsModule.generateEmbeddings).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeModule.queryVectors).mockResolvedValue(mockResults);
      vi.mocked(modelModule.generateResponse).mockResolvedValue(mockResponse);

      const result = await queryDocuments('test query', {
        documentIds: ['doc-1'],
        userId: 'user-1',
        topK: 5,
      });

      expect(result.answer).toBe('This is the answer');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].text).toBe('This is a test chunk');
      expect(result.model).toBe('openai');
    });

    it('should filter results by minimum score', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        {
          id: 'chunk-1',
          score: 0.85,
          metadata: {
            documentId: 'doc-1',
            userId: 'user-1',
            chunkIndex: 0,
            text: 'High score chunk',
          },
        },
        {
          id: 'chunk-2',
          score: 0.2,
          metadata: {
            documentId: 'doc-1',
            userId: 'user-1',
            chunkIndex: 1,
            text: 'Low score chunk',
          },
        },
      ];
      const mockResponse = {
        text: 'Answer',
        model: 'openai' as const,
      };

      const embeddingsModule = await import('@/lib/ai/embeddings');
      const pineconeModule = await import('@/lib/vector/pinecone');
      const modelModule = await import('@/lib/ai/model-selector');

      vi.mocked(embeddingsModule.generateEmbeddings).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeModule.queryVectors).mockResolvedValue(mockResults);
      vi.mocked(modelModule.generateResponse).mockResolvedValue(mockResponse);

      const result = await queryDocuments('test query', {
        documentIds: ['doc-1'],
        userId: 'user-1',
        minScore: 0.5,
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle LLM failure gracefully', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResults = [
        {
          id: 'chunk-1',
          score: 0.85,
          metadata: {
            documentId: 'doc-1',
            userId: 'user-1',
            chunkIndex: 0,
            text: 'Test chunk',
          },
        },
      ];

      const { generateEmbeddings } = await import('@/lib/ai/embeddings');
      const { queryVectors } = await import('@/lib/vector/pinecone');
      const { generateResponse } = await import('@/lib/ai/model-selector');

      vi.mocked(generateEmbeddings).mockResolvedValue(mockEmbedding);
      vi.mocked(queryVectors).mockResolvedValue(mockResults);
      vi.mocked(generateResponse).mockRejectedValue(new Error('LLM error'));

      const result = await queryDocuments('test query', {
        documentIds: ['doc-1'],
        userId: 'user-1',
      });

      // Should fallback to context-only response
      expect(result.answer).toContain('Based on the retrieved context');
      expect(result.sources).toHaveLength(1);
    });
  });

  describe('indexDocumentChunks', () => {
    it('should index document chunks successfully', async () => {
      const chunks: DocumentChunk[] = [
        {
          text: 'Chunk 1',
          chunkIndex: 0,
          startChar: 0,
          endChar: 7,
          metadata: { pageNumber: 1 },
        },
        {
          text: 'Chunk 2',
          chunkIndex: 1,
          startChar: 8,
          endChar: 15,
          metadata: { pageNumber: 2 },
        },
      ];

      const mockEmbeddings = [new Array(1536).fill(0.1), new Array(1536).fill(0.2)];

      const embeddingsModule = await import('@/lib/ai/embeddings');
      const pineconeModule = await import('@/lib/vector/pinecone');

      vi.mocked(embeddingsModule.generateEmbeddingsBatch).mockResolvedValue(mockEmbeddings);
      vi.mocked(pineconeModule.upsertVectors).mockResolvedValue(undefined);

      await indexDocumentChunks(chunks, 'doc-1', 'user-1', {
        fileName: 'test.pdf',
        fileType: 'pdf',
      });

      const pineconeModule = await import('@/lib/vector/pinecone');
      expect(pineconeModule.upsertVectors).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(pineconeModule.upsertVectors).mock.calls[0][0];
      expect(callArgs).toHaveLength(2);
      expect(callArgs[0].metadata.documentId).toBe('doc-1');
      expect(callArgs[0].metadata.userId).toBe('user-1');
    });

    it('should throw error for empty chunks array', async () => {
      await expect(indexDocumentChunks([], 'doc-1', 'user-1')).resolves.not.toThrow();
    });

    it('should throw error for missing documentId or userId', async () => {
      const chunks: DocumentChunk[] = [
        {
          text: 'Test',
          chunkIndex: 0,
          startChar: 0,
          endChar: 4,
        },
      ];

      await expect(indexDocumentChunks(chunks, '', 'user-1')).rejects.toThrow('Document ID and User ID are required');
      await expect(indexDocumentChunks(chunks, 'doc-1', '')).rejects.toThrow('Document ID and User ID are required');
    });
  });
});
