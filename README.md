# DocAI :- Intelligent Document Analysis Platform

[![DocAI Platform](./public/docai-thumbnail.webp)](https://docai-analysis-platform.vercel.app/)

**Live Demo:** [https://docai-analysis-platform.vercel.app/](https://docai-analysis-platform.vercel.app/)

> An AI-powered document analysis platform that processes 100-page PDFs in under 30 seconds and answers questions with 90%+ accuracy using advanced RAG (Retrieval-Augmented Generation) technology.

## ✨ Features

- **Multi-Format Support** - Process PDFs, DOCX, Excel files and scanned documents with OCR
- **AI-Powered Q&A** - Ask questions and get instant answers powered by GPT-4, Claude and Gemini
- **Lightning Fast** - Optimized RAG pipeline processes documents in seconds
- **Multi-Model AI** - Intelligent model selection with automatic fallback for reliability
- **Advanced Analytics** - Extract entities, analyze sentiment and visualize insights
- **Secure & Private** - End-to-end encryption with secure cloud storage

[![DocAI Platform](./public/docai-app-ui.webp)](https://docai-analysis-platform.vercel.app/)

## 🚀 Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Drizzle ORM
- **AI/ML:** LangChain, OpenAI, Anthropic Claude, Google Gemini
- **Storage:** AWS S3, Pinecone Vector Database
- **Auth:** Better Auth
- **Document Processing:** PDF.js, Mammoth (DOCX), SheetJS (Excel)

## 📦 Installation

1. **Clone the repository**

```bash
git clone https://github.com/anjola-adeuyi/docai-analysis-platform.git
cd docai-analysis-platform
```

1. **Install dependencies**

```bash
npm install
```

1. **Set up environment variables**

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Vector Database
PINECONE_API_KEY=...
PINECONE_INDEX=your-index-name

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Caching (Optional but recommended)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
```

See [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md) for detailed information.

1. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Setup

Run database migrations:

```bash
npm run db:migrate
```

Or use Drizzle Kit to push schema:

```bash
npx drizzle-kit push
```

## 🏗️ Project Structure

```text
├── app/                  # Next.js app directory
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/      # Dashboard pages
│   └── api/              # API routes
├── components/           # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── document/         # Document viewer & uploader
│   └── ui/               # shadcn/ui components
├── lib/                  # Core libraries
│   ├── ai/               # AI & RAG pipeline
│   ├── db/               # Database schema
│   ├── processors/       # Document processors
│   └── vector/           # Vector database
├── public/               # Static assets
├── tests/                # Test files
│   ├── ai/               # AI pipeline tests
│   ├── integration/      # Integration tests
│   └── e2e/              # E2E tests
└── docs/                 # Documentation
```

## 📚 Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference with all endpoints
- **[Environment Variables](./docs/ENVIRONMENT_VARIABLES.md)** - Environment setup guide
- **[CI/CD Guide](./docs/CI_CD_GUIDE.md)** - Continuous integration and deployment
- **[Security Best Practices](./docs/SECURITY_BEST_PRACTICES.md)** - Security guidelines

## 🧪 Testing

Run the test suite:

```bash
# Unit and integration tests
npm test

# E2E tests (requires dev server running)
npm run test:e2e

# Test with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

### Deploy to Vercel

1. **Connect your GitHub repository** to Vercel
2. **Configure environment variables** in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`
3. **Deploy:**
   - Vercel will automatically deploy on every push to `main` branch
   - Or manually trigger deployment from Vercel dashboard

### Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Pinecone index created
- [ ] S3 bucket configured with proper permissions
- [ ] Redis cache configured (optional but recommended)
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed instructions.

## 🔑 Key Features

### RAG Pipeline

Advanced retrieval-augmented generation with:

- Intelligent document chunking
- Vector embeddings with Pinecone
- Multi-model query processing
- Context-aware responses

### Document Processing

- **PDF:** Extract text, images and metadata
- **DOCX:** Parse Word documents with formatting
- **Excel:** Process spreadsheets and data tables
- **OCR:** Handle scanned documents

### AI Integration

- **OpenAI GPT-4:** General-purpose reasoning
- **Anthropic Claude:** Long-context analysis
- **Google Gemini:** Multimodal understanding
- **Intelligent Fallback:** Automatic model switching for reliability

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio

# Testing
npm test             # Run unit/integration tests
npm run test:e2e     # Run E2E tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

Built by [Anjola Adeuyi](https://www.anjolaadeuyi.com/) - Senior Full-Stack + AI Engineer

---

**Star ⭐ this repo if you find it useful!**
