# Deployment Guide

Complete guide for deploying DocAI to production.

## Prerequisites

- Vercel account (or your preferred hosting platform)
- PostgreSQL database (Vercel Postgres, Supabase, or similar)
- AWS S3 bucket for file storage
- Pinecone account for vector database
- Upstash Redis (optional but recommended for caching)

## Deployment Steps

### 1. Prepare Your Repository

Ensure your code is ready for deployment:

```bash
# Run tests
npm test
npm run test:e2e

# Build locally to check for errors
npm run build

# Verify TypeScript
npx tsc --noEmit
```

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

1. **Push your code to GitHub**

   ```bash
   git push origin main
   ```

2. **Import project in Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure build settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm ci` (recommended for production)

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 3. Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

#### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=https://your-domain.vercel.app

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
```

#### Optional Variables

```env
# Caching (Recommended)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

**Important:**

- Set variables for **Production**, **Preview**, and **Development** environments
- Use different `BETTER_AUTH_SECRET` for each environment
- Never commit secrets to your repository

### 4. Set Up Database

#### Using Vercel Postgres

1. In Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Copy the connection string to `DATABASE_URL`
4. Run migrations after first deployment:

```bash
# Connect to your database and run migrations
npm run db:migrate
```

Or use Drizzle Studio:

```bash
npx drizzle-kit push
```

#### Using External Database

1. Create PostgreSQL database (Supabase, Railway, etc.)
2. Get connection string
3. Add to Vercel environment variables

### 5. Set Up Pinecone

1. Create a Pinecone account at [pinecone.io](https://www.pinecone.io)
2. Create a new index:
   - Name: `docai-documents` (or your preferred name)
   - Dimensions: `1536` (for OpenAI text-embedding-3-large)
   - Metric: `cosine`
3. Copy API key and index name to Vercel environment variables

### 6. Set Up AWS S3

1. **Create S3 Bucket**

   - Go to AWS S3 Console
   - Create bucket with unique name
   - Choose region (e.g., `us-east-1`)
   - Enable versioning (optional but recommended)

2. **Configure CORS**

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://your-domain.vercel.app"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

3. **Create IAM User**
   - Create IAM user with programmatic access
   - Attach policy with S3 permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
           "Resource": "arn:aws:s3:::your-bucket-name/*"
         }
       ]
     }
     ```
   - Copy Access Key ID and Secret Access Key to Vercel

### 7. Set Up Redis (Optional but Recommended)

1. Create Upstash Redis database at [upstash.com](https://upstash.com)
2. Copy REST URL and token
3. Add to Vercel environment variables:
   - `UPSTASH_REDIS_URL`
   - `UPSTASH_REDIS_TOKEN`

### 8. Run Database Migrations

After first deployment, run migrations:

```bash
# Option 1: Using Vercel CLI
vercel env pull .env.local
npm run db:migrate

# Option 2: Using Drizzle Kit
npx drizzle-kit push
```

Or use Vercel's built-in database tools if using Vercel Postgres.

### 9. Verify Deployment

1. **Check build logs** in Vercel Dashboard
2. **Test the application:**

   - Visit your deployment URL
   - Sign up for an account
   - Upload a test document
   - Verify document processing works

3. **Check logs:**
   - Vercel Dashboard → Logs
   - Monitor for errors or warnings

### 10. Set Up Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your domain

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Pinecone index created and accessible
- [ ] S3 bucket configured with proper permissions
- [ ] Redis cache working (if enabled)
- [ ] Authentication working
- [ ] Document upload working
- [ ] Document processing working
- [ ] AI queries working
- [ ] Analytics working
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Error tracking configured (if using Sentry)

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in Dashboard → Settings → Analytics

### Error Tracking

Consider setting up error tracking:

1. **Sentry:**

   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **LogRocket** or similar service

### Performance Monitoring

- Use Vercel's built-in analytics
- Monitor API response times
- Track document processing times
- Monitor AI API usage and costs

## Troubleshooting

### Build Failures

- Check build logs in Vercel Dashboard
- Verify all environment variables are set
- Ensure `package.json` scripts are correct
- Check for TypeScript errors: `npx tsc --noEmit`

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel's IP ranges
- Ensure SSL is enabled if required

### S3 Upload Failures

- Verify AWS credentials are correct
- Check S3 bucket permissions
- Verify CORS configuration
- Check region matches `AWS_REGION`

### AI API Errors

- Verify API keys are valid
- Check API rate limits
- Monitor usage in provider dashboards
- Verify model names are correct

### Document Processing Failures

- Check Vercel function logs
- Verify document processors are working
- Check Pinecone connection
- Monitor queue processing

## Scaling Considerations

### Database

- Use connection pooling (Vercel Postgres includes this)
- Monitor query performance
- Consider read replicas for high traffic

### File Storage

- Enable S3 lifecycle policies for old files
- Consider CloudFront CDN for faster downloads
- Monitor storage costs

### Vector Database

- Monitor Pinecone index size
- Consider multiple indexes for different document types
- Optimize chunk sizes for better performance

### Caching

- Use Redis for frequently accessed data
- Implement cache warming strategies
- Monitor cache hit rates

## Security Best Practices

1. **Never commit secrets** - Use environment variables only
2. **Rotate API keys regularly**
3. **Use least-privilege IAM policies** for AWS
4. **Enable S3 bucket encryption**
5. **Use HTTPS only** (Vercel provides this automatically)
6. **Implement rate limiting** (already included)
7. **Monitor for suspicious activity**
8. **Keep dependencies updated**

## Rollback Procedure

If deployment fails:

1. Go to Vercel Dashboard → Deployments
2. Find last successful deployment
3. Click "..." → "Promote to Production"
4. Investigate and fix issues
5. Redeploy when ready

## Continuous Deployment

Vercel automatically deploys on:

- Push to `main` branch → Production
- Push to other branches → Preview deployment
- Pull requests → Preview deployment

Configure in Vercel Dashboard → Settings → Git

## Support

For deployment issues:

- Check [Vercel Documentation](https://vercel.com/docs)
- Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- Open an issue on [GitHub](https://github.com/anjola-adeuyi/docai-analysis-platform)
