# Security Best Practices for Open-Source CI/CD

## 🔒 GitHub Secrets Security

### Are GitHub Secrets Safe in Public Repos?

**YES!** GitHub Secrets are encrypted and secure, even in public repositories:

- **Encrypted Storage**: Secrets are encrypted at rest
- **No Exposure**: Secrets never appear in logs, code, or artifacts
- **Access Control**: Only workflows you explicitly grant access can use them
- **Fork Protection**: People who fork your repo don't get your secrets
- **Audit Trail**: GitHub logs all secret access

### However: Best Practice is to Minimize Secret Usage

Even though secrets are secure, **best practice is to avoid using them in CI/CD when possible**.

---

## 🎯 Our Security Strategy

### Principle: **Mock, Don't Call**

For tests, we should **mock external services** instead of using real API keys.

### What We Use:

#### ✅ **Test Services** (No Secrets Needed)

- PostgreSQL container (test database)
- Redis container (test cache)
- These are Docker containers, not production services

#### ✅ **Mocked Services** (No Secrets Needed)

- OpenAI API → Mocked in unit tests
- Anthropic API → Mocked in unit tests
- Google Gemini → Mocked in unit tests
- Pinecone → Mocked in unit tests
- AWS S3 → Mocked in unit tests

#### ✅ **Test Values** (No Secrets Needed)

- `BETTER_AUTH_SECRET`: `test-secret-key-for-ci-only`
- `BETTER_AUTH_URL`: `http://localhost:3000`
- These are test values, not production secrets

---

## 📋 Secret Usage Guidelines

### ❌ **DON'T Use Secrets For:**

1. **Unit Tests**

   - Mock all external APIs
   - No secrets needed

2. **Integration Tests**

   - Use test database/Redis containers
   - Mock external APIs
   - No production secrets needed

3. **Build Process**

   - Use dummy values
   - No secrets needed

4. **E2E Tests (Basic)**
   - Use test database/Redis
   - Mock or skip API-dependent features
   - No production secrets needed

### ✅ **MAY Use Secrets For (If Absolutely Necessary):**

1. **E2E Tests (Advanced)**

   - Only if you need to test real API integrations
   - Use **separate test accounts** (not production)
   - Store as GitHub Secrets
   - Only add to the specific job that needs them

2. **Deployment**
   - Production deployment needs real secrets
   - Store as GitHub Secrets
   - Only add to deployment jobs

---

## 🛡️ Current Workflow Security

### Our `.github/workflows/ci.yml`:

```yaml
# ✅ GOOD: Only non-sensitive at top level
env:
  NODE_VERSION: '20.x'

jobs:
  lint-and-typecheck:
    # ✅ No secrets needed

  unit-tests:
    # ✅ No secrets needed - mocks everything

  integration-tests:
    env:
      # ✅ Only test containers - no secrets
      DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      REDIS_URL: redis://localhost:6379

  build:
    env:
      # ✅ Dummy values - no secrets
      DATABASE_URL: postgresql://dummy:dummy@localhost:5432/dummy

  e2e-tests:
    env:
      # ✅ Only test services - no production secrets
      DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      BETTER_AUTH_SECRET: test-secret-key-for-ci-only
      # ❌ NO production API keys
```

---

## 🔐 If You Need Real Services (Advanced)

### Scenario: You want to test real API integrations in E2E

**Option 1: Use Test Accounts (Recommended)**

```yaml
e2e-tests:
  env:
    # Use separate test API keys (not production)
    OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_API_KEY }}
    # Store test keys as GitHub Secrets
```

**Option 2: Skip API Tests in CI**

```typescript
// In your E2E tests
test('API integration', async ({ page }) => {
  if (process.env.CI && !process.env.ENABLE_API_TESTS) {
    test.skip(); // Skip in CI unless explicitly enabled
  }
  // ... test code
});
```

**Option 3: Use Mock Services**

```typescript
// Mock OpenAI in tests
vi.mock('@/lib/ai/openai', () => ({
  generateResponse: vi.fn().mockResolvedValue('Mocked response'),
}));
```

---

## 📝 GitHub Secrets Setup (If Needed)

### If you need to add secrets later:

1. Go to: **Repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add secret (it will be encrypted)
4. Use in workflow: `${{ secrets.SECRET_NAME }}`

### Important:

- ✅ Secrets are encrypted
- ✅ Only accessible to workflows
- ✅ Never exposed in logs
- ✅ Not accessible to forks
- ❌ Don't commit secrets in code
- ❌ Don't log secrets
- ❌ Don't use production secrets in tests

---

## 🚨 Security Checklist

Before pushing to GitHub:

- [ ] No secrets in code
- [ ] No secrets in `.env` files (use `.env.example`)
- [ ] No secrets in workflow files (use `${{ secrets.XXX }}`)
- [ ] Tests mock external services
- [ ] Only test services used (containers, not production)
- [ ] Secrets only in GitHub Secrets (if needed)
- [ ] Secrets only added to specific jobs (not top-level)

---

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

## ✅ Summary

**Our current setup is secure:**

- ✅ No production secrets in workflows
- ✅ Tests use mocks and test services
- ✅ Open-source friendly
- ✅ Recruiters can see your code safely
- ✅ No secrets exposed

**If you need real services later:**

- Use separate test accounts
- Store as GitHub Secrets
- Only add to specific jobs
- Document why they're needed
