import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { queryDocuments } from '@/lib/ai/rag-pipeline';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/ai/extract-entities?documentId=xxx
 * Extract key entities (people, organizations, locations, dates, etc.) from the document
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Verify document belongs to user
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, session.user.id)))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'completed') {
      return NextResponse.json({ error: 'Document is still processing' }, { status: 202 });
    }

    // Extract entities using RAG pipeline
    const entityPrompt = `Extract all key entities from this document. For each entity, provide:
1. The entity name
2. The entity type (Person, Organization, Location, Date, Money, Product, Event, etc.)
3. A confidence score (0-1)
4. Brief context where the entity appears

Format your response as a JSON array of objects with this structure:
[
  {
    "name": "Entity Name",
    "type": "EntityType",
    "confidence": 0.95,
    "context": "Brief context"
  }
]

Focus on the most important and frequently mentioned entities. Return only the JSON array, no additional text.`;

    const ragResult = await queryDocuments(entityPrompt, {
      documentIds: [documentId],
      userId: session.user.id,
      topK: 15,
      minScore: 0.3,
      modelOptions: {
        strategy: 'fallback',
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 2000,
      },
    });

    // Try to parse the JSON response
    let entities;
    try {
      // Extract JSON from the response (might have markdown code blocks)
      const jsonMatch = ragResult.answer.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        entities = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing the entire answer
        entities = JSON.parse(ragResult.answer);
      }
    } catch (parseError) {
      // If parsing fails, return a structured error
      console.error('Failed to parse entities JSON:', parseError);
      return NextResponse.json(
        {
          error: 'Failed to parse entity extraction results. The AI response was not in the expected format.',
          rawResponse: ragResult.answer,
        },
        { status: 500 }
      );
    }

    // Validate and format entities
    if (!Array.isArray(entities)) {
      return NextResponse.json({ error: 'Invalid entity format' }, { status: 500 });
    }

    // Ensure all entities have required fields
    const formattedEntities = entities
      .filter((e) => e.name && e.type)
      .map((e) => ({
        name: String(e.name),
        type: String(e.type),
        confidence: typeof e.confidence === 'number' ? e.confidence : 0.8,
        context: e.context ? String(e.context) : undefined,
      }))
      .slice(0, 50); // Limit to 50 entities

    return NextResponse.json({
      success: true,
      entities: formattedEntities,
      model: ragResult.model,
    });
  } catch (error) {
    console.error('Extract entities error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extract entities',
      },
      { status: 500 }
    );
  }
}
