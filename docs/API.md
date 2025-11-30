# API Documentation

Complete API reference for the DocAI Intelligent Document Analysis Platform.

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://docai-analysis-platform.vercel.app`

## Authentication

All API endpoints (except authentication) require a valid session cookie. Authentication is handled by Better-Auth.

### Authentication Endpoints

#### `POST /api/auth/[...all]`

Better-Auth handles all authentication routes including:

- Sign up
- Sign in
- Sign out
- Session management

**Note:** This endpoint is managed by Better-Auth. Refer to [Better-Auth documentation](https://www.better-auth.com/docs) for detailed usage.

---

## Document Management

### Get All Documents

**`GET /api/documents`**

Get a list of all documents for the authenticated user.

**Response:**

```json
{
  "success": true,
  "documents": [
    {
      "id": "doc_123",
      "fileName": "example.pdf",
      "fileType": "pdf",
      "fileSize": 1024000,
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized

---

### Upload Document

**`POST /api/documents/upload`**

Upload a new document (PDF, DOCX, or XLSX).

**Request:**

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File) - The document file to upload (max 50MB)

**Supported File Types:**

- `application/pdf` - PDF documents
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX files
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - XLSX files

**Response:**

```json
{
  "success": true,
  "documentId": "doc_123",
  "document": {
    "id": "doc_123",
    "fileName": "example.pdf",
    "fileType": "pdf",
    "fileSize": 1024000,
    "status": "uploaded",
    "s3Key": "user_123/documents/example.pdf",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Status Codes:**

- `200` - Upload successful
- `400` - Invalid file type or size
- `401` - Unauthorized
- `403` - Quota exceeded
- `429` - Rate limit exceeded
- `500` - Server error

**Notes:**

- Document processing starts automatically after upload
- Processing status: `uploaded` → `processing` → `completed` or `error`
- Rate limiting and quota checks apply based on subscription tier

---

### Get Document Details

**`GET /api/documents/[id]`**

Get details and presigned URL for a specific document.

**Parameters:**

- `id` (string) - Document ID

**Response:**

```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "fileName": "example.pdf",
    "fileType": "pdf",
    "fileSize": 1024000,
    "status": "completed",
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "url": "https://s3.amazonaws.com/..."
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

**Notes:**

- Presigned URL is valid for 1 hour
- Only returns documents owned by the authenticated user

---

### Get Document Content

**`GET /api/documents/[id]/content`**

Get the extracted text content of a document.

**Parameters:**

- `id` (string) - Document ID

**Response:**

```json
{
  "success": true,
  "content": "Extracted text content from the document...",
  "metadata": {
    "pageCount": 10,
    "wordCount": 5000
  }
}
```

**Status Codes:**

- `200` - Success
- `202` - Document still processing
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

---

### Download Document

**`GET /api/documents/[id]/download`**

Get a presigned download URL for the original document file.

**Parameters:**

- `id` (string) - Document ID

**Response:**

```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/...",
  "fileName": "example.pdf"
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

---

### Export Document Analysis

**`GET /api/documents/[id]/export?format=json|csv|pdf`**

Export document analysis data including conversations and messages.

**Parameters:**

- `id` (string) - Document ID
- `format` (string, optional) - Export format: `json` (default), `csv`, or `pdf`

**Response:**

- **JSON format:** Returns JSON object with document, conversations, and messages
- **CSV format:** Returns CSV file with message data
- **PDF format:** Currently returns 501 (Not Implemented)

**Status Codes:**

- `200` - Success
- `400` - Invalid format
- `401` - Unauthorized
- `404` - Document not found
- `501` - PDF export not implemented
- `500` - Server error

---

### Process Document

**`POST /api/documents/process`**

Manually trigger document processing (useful for retrying failed documents).

**Request:**

```json
{
  "documentId": "doc_123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Document processing started"
}
```

**Status Codes:**

- `200` - Processing started
- `400` - Invalid request
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

---

## AI Analysis

### Query Documents

**`POST /api/ai/query`**

Ask questions about documents using the RAG (Retrieval Augmented Generation) pipeline.

**Request:**

```json
{
  "query": "What is the main topic of this document?",
  "documentIds": ["doc_123"],
  "conversationId": "conv_456",
  "modelStrategy": "fallback",
  "preferredModel": "openai",
  "minScore": 0.3,
  "topK": 5
}
```

**Request Parameters:**

- `query` (string, required) - The question to ask
- `documentIds` (string[], optional) - Array of document IDs to query. If omitted, queries all user documents
- `conversationId` (string, optional) - Conversation ID to continue an existing conversation
- `modelStrategy` (string, optional) - Model selection strategy: `fallback` (default), `cost`, `performance`
- `preferredModel` (string, optional) - Preferred model: `openai`, `anthropic`, `gemini`
- `minScore` (number, optional) - Minimum similarity score for chunks (default: 0.3)
- `topK` (number, optional) - Number of top chunks to retrieve (default: 5)

**Response:**

```json
{
  "success": true,
  "answer": "The main topic is...",
  "sources": [
    {
      "text": "Relevant chunk text...",
      "documentId": "doc_123",
      "chunkIndex": 0,
      "score": 0.85
    }
  ],
  "model": "openai",
  "conversationId": "conv_456",
  "cached": false
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid query
- `401` - Unauthorized
- `404` - Document not found
- `429` - Rate limit exceeded
- `500` - Server error

**Notes:**

- Results are cached for improved performance
- Supports multi-model AI with automatic fallback
- Creates or updates conversation history automatically

---

### Summarize Document

**`GET /api/ai/summarize?documentId=xxx`**

Generate a comprehensive summary of a document.

**Query Parameters:**

- `documentId` (string, required) - Document ID

**Response:**

```json
{
  "success": true,
  "summary": "This document discusses...",
  "model": "openai",
  "cached": false
}
```

**Status Codes:**

- `200` - Success
- `202` - Document still processing
- `400` - Document ID required
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

**Notes:**

- Results are cached for 24 hours
- Only works for documents with status `completed`

---

### Extract Entities

**`GET /api/ai/extract-entities?documentId=xxx`**

Extract key entities (people, organizations, locations, dates, etc.) from a document.

**Query Parameters:**

- `documentId` (string, required) - Document ID

**Response:**

```json
{
  "success": true,
  "entities": [
    {
      "name": "John Doe",
      "type": "Person",
      "confidence": 0.95,
      "context": "CEO of the company"
    },
    {
      "name": "Acme Corp",
      "type": "Organization",
      "confidence": 0.92,
      "context": "Technology company"
    }
  ],
  "model": "openai",
  "cached": false
}
```

**Status Codes:**

- `200` - Success
- `202` - Document still processing
- `400` - Document ID required
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

**Entity Types:**

- Person
- Organization
- Location
- Date
- Money
- Product
- Event
- Other

**Notes:**

- Returns up to 50 entities
- Results are cached for 24 hours
- Only works for documents with status `completed`

---

### Analyze Sentiment

**`GET /api/ai/sentiment?documentId=xxx`**

Analyze the sentiment of a document (positive, negative, neutral).

**Query Parameters:**

- `documentId` (string, required) - Document ID

**Response:**

```json
{
  "success": true,
  "sentiment": {
    "overall": "positive",
    "score": 0.75,
    "breakdown": {
      "positive": 0.6,
      "neutral": 0.3,
      "negative": 0.1
    }
  },
  "model": "openai",
  "cached": false
}
```

**Status Codes:**

- `200` - Success
- `202` - Document still processing
- `400` - Document ID required
- `401` - Unauthorized
- `404` - Document not found
- `500` - Server error

**Notes:**

- Results are cached for 24 hours
- Only works for documents with status `completed`

---

## Analytics

### Get Analytics Data

**`GET /api/analytics?startDate=xxx&endDate=xxx`**

Get analytics data including document statistics, usage stats, timeline, and visualizations.

**Query Parameters:**

- `startDate` (string, optional) - ISO date string for start date filter
- `endDate` (string, optional) - ISO date string for end date filter

**Response:**

```json
{
  "success": true,
  "data": {
    "documentStats": {
      "total": 10,
      "byType": {
        "pdf": 7,
        "docx": 2,
        "xlsx": 1
      },
      "byStatus": {
        "uploaded": 0,
        "processing": 1,
        "completed": 8,
        "error": 1
      }
    },
    "usageStats": {
      "totalCost": 5000,
      "totalActions": 100,
      "costByAction": [
        {
          "action": "query",
          "cost": 3000,
          "count": 50
        }
      ],
      "costByModel": [
        {
          "model": "openai",
          "cost": 4000,
          "count": 80
        }
      ]
    },
    "timelineData": [
      {
        "id": "doc_123",
        "fileName": "example.pdf",
        "fileType": "pdf",
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "entityFrequency": [
      {
        "name": "John Doe",
        "count": 15,
        "type": "Person"
      }
    ],
    "sentimentDistribution": {
      "positive": 0.6,
      "negative": 0.1,
      "neutral": 0.3
    }
  }
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `500` - Server error

**Notes:**

- Cost values are in cents
- Timeline data is sorted by creation date (newest first)

---

## Conversations

### Get Conversations

**`GET /api/conversations?documentId=xxx`**

Get all conversations for the authenticated user, optionally filtered by document.

**Query Parameters:**

- `documentId` (string, optional) - Filter conversations by document ID

**Response:**

```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_456",
      "title": "Document Analysis",
      "documentId": "doc_123",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### Delete Conversation

**`DELETE /api/conversations/[id]`**

Delete a conversation and all its messages.

**Parameters:**

- `id` (string) - Conversation ID

**Response:**

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `404` - Conversation not found or access denied
- `500` - Server error

---

## Rate Limiting

API endpoints are rate-limited based on subscription tier:

- **Free Tier:** 10 requests/minute, 100 requests/hour
- **Pro Tier:** 50 requests/minute, 1000 requests/hour
- **Enterprise Tier:** 200 requests/minute, unlimited/hour

Rate limit headers are included in responses:

- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Unix timestamp when the limit resets

When rate limit is exceeded, a `429 Too Many Requests` response is returned.

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description",
  "message": "Additional details (optional)"
}
```

**Common Status Codes:**

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (quota exceeded, access denied)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `501` - Not Implemented

---

## Caching

Several endpoints use Redis caching for improved performance:

- **Query Results:** Cached for 1 hour
- **Document Summaries:** Cached for 24 hours
- **Entity Extraction:** Cached for 24 hours
- **Sentiment Analysis:** Cached for 24 hours

Cached responses include a `cached: true` field in the response.

---

## Webhooks

Currently, webhooks are not implemented. Future versions may include:

- Document processing completion notifications
- Error notifications
- Usage limit warnings

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Upload a document
const formData = new FormData();
formData.append('file', file);

const uploadResponse = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});

// Query a document
const queryResponse = await fetch('/api/ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What is this document about?',
    documentIds: ['doc_123'],
  }),
});
```

### cURL

```bash
# Upload document
curl -X POST \
  -F "file=@document.pdf" \
  -b "session_cookie=..." \
  http://localhost:3000/api/documents/upload

# Query document
curl -X POST \
  -H "Content-Type: application/json" \
  -b "session_cookie=..." \
  -d '{"query":"What is this about?","documentIds":["doc_123"]}' \
  http://localhost:3000/api/ai/query
```

---

## Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/anjola-adeuyi/docai-analysis-platform).
