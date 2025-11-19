import { generateEmbeddings, generateEmbeddingsBatch } from './embeddings';
import { queryVectors, upsertVectors, VectorMetadata } from '../vector/pinecone';
import { DocumentChunk } from './chunking';
import { generateResponse, ModelOptions } from './model-selector';
import { nanoid } from 'nanoid';

/**
 * RAG query result with answer and source citations
 */
export interface RAGResult {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
    metadata: VectorMetadata;
  }>;
  context: string;
  model?: string; // Which AI model was used
}

/**
 * Options for RAG query
 */
export interface RAGQueryOptions {
  documentIds?: string[];
  userId?: string;
  topK?: number;
  minScore?: number;
  includeMetadata?: boolean;
  modelOptions?: ModelOptions;
}

/**
 * Basic RAG pipeline for querying documents
 * This is a foundational structure that will be extended with LLM integration in later tasks
 *
 * @param query - The user's question/query
 * @param options - Query options including document filters
 * @returns RAG result with relevant chunks and context
 * @throws Error if query fails or no relevant chunks are found
 */
export async function queryDocuments(query: string, options: RAGQueryOptions = {}): Promise<RAGResult> {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const { documentIds, userId, topK = 5, minScore = 0.3 } = options;

  try {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateEmbeddings(query);

    // Step 2: Build metadata filter if documentIds or userId provided
    const filter: Record<string, unknown> = {};
    if (documentIds && documentIds.length > 0) {
      filter.documentId = { $in: documentIds };
    }
    if (userId) {
      filter.userId = { $eq: userId };
    }

    // Step 3: Query Pinecone for relevant chunks
    const results = await queryVectors(queryEmbedding, topK, Object.keys(filter).length > 0 ? filter : undefined);

    // Step 4: Filter by minimum score threshold with progressive fallback
    // This handles generic queries that have low semantic similarity scores
    let filteredResults = results.filter((result) => result.score >= minScore);

    // Fallback strategy: If no results found, progressively lower threshold
    // This is a common industry practice for handling generic/abstract queries
    if (filteredResults.length === 0 && results.length > 0) {
      const fallbackThresholds = [minScore * 0.5, 0.1, 0.05];

      for (const fallbackThreshold of fallbackThresholds) {
        filteredResults = results.filter((result) => result.score >= fallbackThreshold);
        if (filteredResults.length > 0) {
          console.log(
            `Using fallback threshold ${fallbackThreshold} (found ${filteredResults.length} chunks, original threshold: ${minScore})`
          );
          break;
        }
      }
    }

    // Final fallback: If still no results but we have chunks, use top chunks regardless of score
    // This ensures we always return something if chunks exist, letting the LLM determine relevance
    if (filteredResults.length === 0 && results.length > 0) {
      console.warn(`No chunks above threshold, using top ${Math.min(3, results.length)} chunks regardless of score`);
      filteredResults = results.slice(0, Math.min(3, results.length));
    }

    if (filteredResults.length === 0) {
      throw new Error('No relevant document chunks found for the query');
    }

    // Step 5: Build context from retrieved chunks
    const sources = filteredResults.map((result) => ({
      text: result.metadata.text || '',
      score: result.score,
      metadata: result.metadata,
    }));

    // Combine chunks into context, ordered by relevance score
    const context = sources.map((source, index) => `[${index + 1}] ${source.text}`).join('\n\n');

    // Step 6: Generate answer using LLM with RAG prompt
    const { modelOptions } = options;
    const prompt = buildRAGPrompt(query, context);

    let answer: string;
    let modelUsed: string | undefined;

    try {
      const modelResponse = await generateResponse(prompt, modelOptions);
      answer = modelResponse.text;
      modelUsed = modelResponse.model;

      if (!answer || answer.trim().length === 0) {
        throw new Error('Empty response from LLM');
      }
    } catch (error) {
      // Fallback to context-only response if LLM fails
      console.error('LLM generation failed, using context-only response:', error);
      answer = `Based on the retrieved context, here are the relevant passages:\n\n${context}`;
    }

    return {
      answer,
      sources,
      context,
      model: modelUsed,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`RAG query failed: ${error.message}`);
    }
    throw new Error('RAG query failed: Unknown error');
  }
}

/**
 * Process and index document chunks into Pinecone
 * This function will be called after document processing to create embeddings
 *
 * @param chunks - Array of document chunks to index
 * @param documentId - The document ID these chunks belong to
 * @param userId - The user ID who owns the document
 * @param metadata - Additional metadata to attach to vectors
 * @throws Error if indexing fails
 */
export async function indexDocumentChunks(
  chunks: DocumentChunk[],
  documentId: string,
  userId: string,
  metadata?: {
    fileName?: string;
    fileType?: string;
    [key: string]: unknown;
  }
): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  if (!documentId || !userId) {
    throw new Error('Document ID and User ID are required');
  }

  try {
    // Generate embeddings for all chunks in batch
    const texts = chunks.map((chunk) => chunk.text);
    const embeddings = await generateEmbeddingsBatch(texts);

    if (embeddings.length !== chunks.length) {
      throw new Error('Mismatch between chunks and embeddings count');
    }

    // Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, index) => ({
      id: `${documentId}-chunk-${chunk.chunkIndex}-${nanoid(8)}`,
      values: embeddings[index],
      metadata: {
        documentId,
        userId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        pageNumber: chunk.metadata?.pageNumber,
        fileName: metadata?.fileName,
        fileType: metadata?.fileType,
        createdAt: new Date().toISOString(),
        ...chunk.metadata,
        ...metadata,
      } as VectorMetadata,
    }));

    // Upsert to Pinecone
    await upsertVectors(vectors);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to index document chunks: ${error.message}`);
    }
    throw new Error('Failed to index document chunks: Unknown error');
  }
}

/**
 * Build a prompt template for LLM queries
 * This will be used when integrating with LLMs
 *
 * @param query - The user's query
 * @param context - The retrieved context from vector search
 * @returns Formatted prompt string
 */
export function buildRAGPrompt(query: string, context: string): string {
  return `You are a helpful AI assistant that answers questions based on the provided document context.

Context from documents:
${context}

Question: ${query}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to answer the question, please say so. Include citations to the relevant passages using [1], [2], etc.`;
}
