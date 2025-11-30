# CI/CD Guide for DocAI Analysis Platform

## What is CI/CD?

**CI (Continuous Integration)**: Automatically test and validate code changes when developers push to the repository.

**CD (Continuous Deployment)**: Automatically deploy code to production after it passes all tests.

### Benefits:

- Catch bugs early before they reach production
- Ensure code quality and consistency
- Enable fast, confident deployments
- Prevent "works on my machine" issues
- Automate repetitive tasks

---

## Testing Pyramid Strategy

### 🏗️ The Testing Pyramid

```
        /\
       /  \     E2E Tests (Few, Slow, Expensive)
      /____\
     /      \   Integration Tests (Some, Medium)
    /________\
   /          \  Unit Tests (Many, Fast, Cheap)
  /____________\
```

### What to Run in CI/CD:

#### ✅ **Unit Tests** (Run Always - Fast)

- **When**: Every commit, every PR
- **Speed**: ~10-30 seconds
- **Purpose**: Test individual functions/components in isolation
- **Example**: Testing a utility function, a React component render
- **Why First**: Fast feedback, catches most bugs early

#### ✅ **Integration Tests** (Run Always - Medium)

- **When**: Every commit, every PR
- **Speed**: ~1-2 minutes
- **Purpose**: Test how different parts work together
- **Example**: Testing API routes with database, testing document processing flow
- **Why Second**: Catches integration issues before E2E

#### ⚠️ **E2E Tests** (Run Selectively - Slow)

- **When**:
  - On PRs to `main`/`develop`
  - Before releases
  - NOT on every feature branch (too slow)
- **Speed**: ~5-15 minutes
- **Purpose**: Test the full user journey end-to-end
- **Example**: Sign in → Upload document → Query document
- **Why Last**: Expensive, but validates the full system

#### 🔍 **Linting & Type Checking** (Run Always - Very Fast)

- **When**: Every commit
- **Speed**: ~5-10 seconds
- **Purpose**: Catch syntax errors, type errors, code style issues
- **Why First**: Instant feedback, prevents build failures

---

## Industry Standard CI/CD Practices

### 1. **Fast Feedback Loop**

```
Developer pushes code
    ↓
Lint & Type Check (5s) ← Fast feedback
    ↓
Unit Tests (30s) ← Still fast
    ↓
Integration Tests (2min) ← Medium
    ↓
Build Check (1min) ← Ensure it compiles
    ↓
E2E Tests (10min) ← Only if others pass
    ↓
Deploy to Staging
    ↓
Deploy to Production
```

### 2. **Fail Fast Principle**

- Run fastest tests first
- Stop pipeline if early tests fail
- Don't waste time on slow tests if fast ones fail

### 3. **Parallel Execution**

- Run independent jobs in parallel
- Lint, Unit Tests, and Build can run simultaneously
- E2E tests run only after fast tests pass

### 4. **Test Stability**

- Use retries for flaky tests (E2E only)
- Use test isolation (each test independent)
- Use proper cleanup (database, files, etc.)

---

## Our CI/CD Pipeline Structure

### Workflow: `.github/workflows/ci.yml`

#### Job 1: Lint & Type Check (5 min timeout)

- Runs: Every commit
- Purpose: Catch syntax/type errors immediately
- Fails: If TypeScript errors or critical lint issues

#### Job 2: Unit Tests (10 min timeout)

- Runs: Every commit
- Purpose: Test individual functions/components
- Fails: If any unit test fails
- Coverage: Uploads to Codecov (optional)

#### Job 3: Integration Tests (15 min timeout)

- Runs: Every commit
- Purpose: Test API routes, database interactions
- Services: PostgreSQL, Redis (Docker containers)
- Fails: If integration test fails

#### Job 4: Build Check (10 min timeout)

- Runs: Every commit
- Purpose: Ensure project builds successfully
- Fails: If build fails

#### Job 5: E2E Tests (20 min timeout)

- Runs: Only if Jobs 1-4 pass
- Purpose: Test full user journeys
- Services: PostgreSQL, Redis
- Browser: Chromium only (faster than all browsers)
- Retries: 2 retries on failure (configured in playwright.config.ts)
- Artifacts: Uploads test reports

#### Job 6: Security Scan (5 min timeout)

- Runs: Every commit
- Purpose: Check for known vulnerabilities
- Fails: Never (continue-on-error: true) - just warns

---

## Best Practices for High-Velocity Projects

### 1. **Test Stability Strategies**

#### ✅ DO:

- **Keep tests independent**: Each test should work alone
- **Use proper cleanup**: Reset database/state between tests
- **Mock external services**: Don't call real APIs in tests
- **Use test data factories**: Consistent test data
- **Retry flaky E2E tests**: But investigate why they're flaky

#### ❌ DON'T:

- **Don't test implementation details**: Test behavior, not code
- **Don't share state between tests**: Each test should be isolated
- **Don't rely on test order**: Tests should pass in any order
- **Don't ignore flaky tests**: Fix them, don't just retry

### 2. **Speed Optimization**

#### For Unit Tests:

```typescript
// ✅ Fast: Mock dependencies
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(),
}));

// ❌ Slow: Real API calls
const data = await fetchData(); // Don't do this in unit tests
```

#### For E2E Tests:

```typescript
// ✅ Fast: Only test critical paths
test('user can sign in and view documents', ...);

// ❌ Slow: Testing every possible combination
test('user can sign in with 50 different email formats', ...);
```

### 3. **Test Organization**

```
tests/
├── unit/              # Fast, many tests
│   ├── utils/
│   ├── components/
│   └── lib/
├── integration/       # Medium, some tests
│   ├── api/
│   └── services/
└── e2e/              # Slow, few tests
    └── critical-flows/
```

### 4. **CI/CD Configuration Tips**

#### Timeouts:

- Set reasonable timeouts for each job
- Fail fast if something hangs

#### Caching:

- Cache `node_modules` (GitHub Actions does this automatically)
- Cache Playwright browsers (they're large)

#### Conditional Execution:

```yaml
# Only run E2E on main branch or PRs
if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
```

### 5. **Handling Test Failures**

#### In High-Velocity Projects:

1. **Immediate**: Fast tests (lint, unit) must pass
2. **Before Merge**: Integration tests must pass
3. **Before Release**: E2E tests must pass
4. **Optional**: Security scans (warn, don't block)

#### Flaky Test Strategy:

```yaml
# In playwright.config.ts
retries: process.env.CI ? 2 : 0  # Retry 2x in CI only
```

But also:

- Investigate why tests are flaky
- Fix root cause, don't just retry
- Consider if test is testing the right thing

---

## GitHub Actions Secrets Setup

### ⚠️ **IMPORTANT: Security for Open-Source Repos**

**Our workflow uses NO production secrets!** Tests mock external services and use test containers.

### ✅ **What We Actually Use:**

**Test Services (No Secrets Needed):**

- PostgreSQL container (test database)
- Redis container (test cache)
- Test values for auth (`test-secret-key-for-ci-only`)

**Mocked Services (No Secrets Needed):**

- All AI APIs are mocked in tests
- AWS S3 is mocked in tests
- Pinecone is mocked in tests

### 🔐 **If You Need Secrets Later (Optional):**

Only add secrets if you need to test real API integrations:

1. **Use Test Accounts** (not production):

   ```
   OPENAI_TEST_API_KEY    # Separate test account
   ANTHROPIC_TEST_API_KEY # Separate test account
   ```

2. **Store as GitHub Secrets**:

   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret (it will be encrypted)
   - Use in workflow: `${{ secrets.SECRET_NAME }}`

3. **Only Add to Specific Jobs**:
   ```yaml
   e2e-tests:
     env:
       OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_API_KEY }}
       # Only add to job that needs it
   ```

### ✅ **Optional Secrets:**

```
CODECOV_TOKEN         # For coverage reports (optional)
```

**See `docs/SECURITY_BEST_PRACTICES.md` for detailed security guidelines.**

---

## Local Testing Before Push

### Pre-commit Checklist:

```bash
# 1. Run linter
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Run unit tests
npm test

# 4. Run integration tests (if you have them)
npm test -- tests/integration

# 5. Build check
npm run build

# 6. Run E2E tests (optional, but recommended before PR)
npm run test:e2e
```

### Git Hooks (Optional):

Create `.husky/pre-commit`:

```bash
#!/bin/sh
npm run lint
npx tsc --noEmit
npm test -- --run
```

---

## Monitoring CI/CD Health

### Key Metrics:

1. **Pipeline Success Rate**: Should be >95%
2. **Average Pipeline Time**: Should be <15 minutes
3. **Test Flakiness Rate**: Should be <5%
4. **Time to First Feedback**: Should be <1 minute

### GitHub Actions Insights:

- Go to: Repository → Insights → Actions
- Monitor: Success rate, average duration, failure reasons

---

## Troubleshooting Common Issues

### Issue: Tests pass locally but fail in CI

**Solutions:**

- Check environment variables are set
- Check database/Redis services are running
- Check timeouts are sufficient
- Check for race conditions

### Issue: E2E tests are too slow

**Solutions:**

- Run only critical paths in CI
- Use only Chromium (not all browsers)
- Run E2E only on main branch
- Optimize test data setup

### Issue: Flaky tests

**Solutions:**

- Add retries (temporary fix)
- Investigate root cause (proper fix)
- Use proper waits instead of fixed timeouts
- Ensure test isolation

---

## Next Steps

1. ✅ **Set up GitHub Secrets** (see above)
2. ✅ **Push the workflow file** to your repository
3. ✅ **Test the pipeline** by creating a PR
4. ✅ **Monitor and optimize** based on results
5. ✅ **Add more tests** as you develop features

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI/CD Guide](https://playwright.dev/docs/ci)
- [Vitest CI/CD Guide](https://vitest.dev/guide/ci.html)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
