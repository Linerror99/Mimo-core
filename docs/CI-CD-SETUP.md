# CI/CD Setup Guide - Mimo Finance

This guide explains how to set up Continuous Integration and Continuous Deployment (CI/CD) for Mimo Finance using GitHub Actions and SonarCloud.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [SonarCloud Setup](#sonarcloud-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Local Testing](#local-testing)
6. [Workflows Explanation](#workflows-explanation)
7. [Quality Gates](#quality-gates)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Our CI/CD pipeline consists of:

- **CI Pipeline** (`.github/workflows/ci.yml`): Linting, type checking, unit tests, integration tests
- **SonarCloud Analysis** (`.github/workflows/sonar.yml`): Code quality, coverage, security analysis

### CI Pipeline Flow

```
┌─────────────┐
│   Push/PR   │
└──────┬──────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌──────────────┐                   ┌──────────────┐
│   Backend    │                   │   Frontend   │
│  Lint & Type │                   │  Lint & Type │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                   ┌──────────────┐
│   Backend    │                   │   Frontend   │
│  Unit Tests  │                   │  Unit Tests  │
│  Coverage    │                   │  Coverage    │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       └──────────────┬───────────────────┘
                      │
                      ▼
               ┌──────────────┐
               │     Build    │
               │    Docker    │
               │    Images    │
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │ Integration  │
               │    Tests     │
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │  SonarCloud  │
               │   Analysis   │
               └──────────────┘
```

---

## Prerequisites

- GitHub account with admin access to repository
- SonarCloud account (free for open-source projects)
- Git installed locally
- Docker and Docker Compose installed (for local testing)
- VS Code with GitHub Actions extension (optional, for local testing)

---

## SonarCloud Setup

### Step 1: Create SonarCloud Account

1. Go to [SonarCloud](https://sonarcloud.io/)
2. Click **"Log in"** and choose **"With GitHub"**
3. Authorize SonarCloud to access your GitHub account
4. You'll be redirected to SonarCloud dashboard

### Step 2: Import Repository

1. Click **"+"** (top-right) → **"Analyze new project"**
2. Select your GitHub organization: **`Linerror99`**
3. Find and select: **`Mimo-core`**
4. Click **"Set Up"**
5. Choose **"With GitHub Actions"**

### Step 3: Get Organization and Project Keys

You should see:
- **Organization Key**: `linerror99`
- **Project Key**: `Linerror99_Mimo-core`

These are already configured in `sonar-project.properties` ✅

### Step 4: Generate SonarCloud Token

1. Click your avatar (top-right) → **"My Account"**
2. Go to **"Security"** tab
3. Under **"Generate Tokens"**:
   - Name: `Mimo-Finance-CI`
   - Type: **Project Analysis Token**
   - Project: **Mimo-core**
   - Expiration: **90 days** (or your preference)
4. Click **"Generate"**
5. **⚠️ COPY THE TOKEN NOW** - You won't see it again!

Example token: `sqp_1234567890abcdef1234567890abcdef12345678`

---

## GitHub Secrets Configuration

### Step 1: Add SONAR_TOKEN to GitHub

1. Go to your repository: `https://github.com/Linerror99/Mimo-core`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `SONAR_TOKEN`
5. Value: Paste the token from SonarCloud
6. Click **"Add secret"**

### Step 2: Verify Secrets

Your repository should have:
- ✅ `SONAR_TOKEN` (from SonarCloud)
- ✅ `GITHUB_TOKEN` (automatically provided by GitHub Actions)

---

## Local Testing

### Option 1: Using GitHub Actions Extension (Recommended)

1. **Install Extension**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for **"GitHub Actions"** by GitHub
   - Install it

2. **Run Workflow Locally**:
   ```bash
   # Open Command Palette (Ctrl+Shift+P)
   # Type: "GitHub Actions: Run Workflow"
   # Select: ci.yml or sonar.yml
   ```

3. **View Results**:
   - Check the **GitHub Actions** panel in VS Code
   - See logs, errors, and results

### Option 2: Using Act (CLI Tool)

1. **Install Act**:
   ```bash
   # Windows (with Chocolatey)
   choco install act-cli
   
   # Or download from: https://github.com/nektos/act/releases
   ```

2. **Run CI Workflow**:
   ```bash
   # Dry run (see what would execute)
   act -n
   
   # Run specific workflow
   act -W .github/workflows/ci.yml
   
   # Run specific job
   act -j backend-tests
   ```

3. **Create Act Secrets** (optional):
   ```bash
   # Create .secrets file
   echo "SONAR_TOKEN=your_token_here" > .secrets
   
   # Run with secrets
   act -W .github/workflows/sonar.yml --secret-file .secrets
   ```

### Option 3: Manual Component Testing

Test individual components without running full workflow:

```bash
# 1. Backend Linting
cd backend
ruff check app/ tests/

# 2. Backend Type Checking
mypy app/ --ignore-missing-imports

# 3. Backend Tests with Coverage
pytest tests/ -v --cov=app --cov-report=xml --cov-report=term-missing --cov-fail-under=85

# 4. Frontend Linting
cd ../frontend
npm run lint

# 5. Frontend Type Checking
npx tsc --noEmit

# 6. Frontend Tests with Coverage
npm run test:coverage

# 7. Integration Tests
cd ..
docker compose up -d
bash scripts/health-check.sh
docker compose down -v
```

---

## Workflows Explanation

### CI Workflow (`ci.yml`)

**Jobs**:

1. **backend-lint** (2-3 min)
   - Runs Ruff linter
   - Runs Mypy type checker
   - Fails if linting/type errors found

2. **backend-tests** (3-5 min)
   - Starts PostgreSQL and Redis services
   - Runs pytest with coverage
   - Fails if coverage < 85%
   - Uploads coverage.xml artifact

3. **frontend-lint** (1-2 min)
   - Runs ESLint
   - Runs TypeScript compiler
   - Fails if linting/type errors found

4. **frontend-tests** (2-4 min)
   - Runs Jest/Vitest tests
   - Generates coverage report
   - Uploads coverage/lcov.info artifact

5. **build-images** (3-5 min)
   - Builds backend Docker image
   - Builds frontend Docker image
   - Uses layer caching for speed

6. **integration-tests** (3-5 min)
   - Starts full stack with docker-compose
   - Tests API health endpoints
   - Tests API documentation
   - Verifies all services are healthy

7. **ci-summary** (< 1 min)
   - Checks all job results
   - Fails if any job failed
   - Provides summary of CI run

**Total CI Time**: ~15-25 minutes

### SonarCloud Workflow (`sonar.yml`)

**Jobs**:

1. **sonarcloud** (5-10 min)
   - Runs backend tests to generate coverage.xml
   - Runs frontend tests to generate lcov.info
   - Uploads code to SonarCloud
   - Analyzes code quality, security, duplication
   - Waits for Quality Gate result
   - Fails if Quality Gate fails

**Total SonarCloud Time**: ~5-10 minutes

---

## Quality Gates

### Current Quality Gate Configuration

Defined in `sonar-project.properties`:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Coverage** | > 85% | Percentage of code covered by tests |
| **Duplicated Lines** | < 3% | Percentage of duplicated code |
| **Maintainability Rating** | A | Code complexity and maintainability |
| **Reliability Rating** | A | Bug-free code |
| **Security Rating** | A | Security vulnerabilities |

### Quality Gate Behavior

- **✅ Pass**: All metrics meet thresholds → Merge allowed
- **❌ Fail**: Any metric below threshold → Merge blocked
- **⚠️ Warning**: Non-blocking issues detected → Review recommended

### How to Check Quality Gate Status

1. **In GitHub PR**:
   - See SonarCloud check status
   - Click "Details" to view full report

2. **In SonarCloud Dashboard**:
   - Go to https://sonarcloud.io/project/overview?id=Linerror99_Mimo-core
   - View all metrics and trends

3. **In VS Code**:
   - Use SonarLint extension (optional)
   - See issues inline while coding

---

## Troubleshooting

### Issue 1: SonarCloud Token Error

**Symptom**:
```
Error: SonarCloud token is invalid or expired
```

**Solution**:
1. Generate new token in SonarCloud (see [Step 4](#step-4-generate-sonarcloud-token))
2. Update `SONAR_TOKEN` secret in GitHub
3. Re-run workflow

### Issue 2: Coverage Below 85%

**Symptom**:
```
Quality Gate failed: Coverage 78.5% (threshold: 85%)
```

**Solution**:
1. Identify uncovered code:
   ```bash
   pytest tests/ --cov=app --cov-report=html
   # Open backend/htmlcov/index.html
   ```
2. Add tests for uncovered lines
3. Run locally to verify: `pytest --cov-fail-under=85`
4. Push updated tests

### Issue 3: Duplicated Code > 3%

**Symptom**:
```
Quality Gate failed: Duplicated lines 5.2% (threshold: 3%)
```

**Solution**:
1. View duplicated blocks in SonarCloud
2. Extract common code into shared functions/components
3. Use inheritance or composition patterns
4. Re-run analysis

### Issue 4: Backend Tests Failing in CI

**Symptom**:
```
Error: Connection refused (PostgreSQL)
```

**Solution**:
1. Check service health in workflow logs
2. Increase wait time in workflow:
   ```yaml
   options: >-
     --health-interval 10s
     --health-timeout 5s
     --health-retries 10  # Increased from 5
   ```
3. Verify DATABASE_URL environment variable

### Issue 5: Frontend Build Fails

**Symptom**:
```
Error: Cannot find module '@/components/...'
```

**Solution**:
1. Check `tsconfig.json` path aliases
2. Verify all imports use correct paths
3. Run locally: `npm run build`
4. Check for missing dependencies: `npm install`

### Issue 6: Integration Tests Timeout

**Symptom**:
```
Error: Timeout waiting for http://localhost:8000/health
```

**Solution**:
1. Increase timeout in workflow:
   ```yaml
   run: |
     timeout 120 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done'
   ```
2. Check docker-compose logs:
   ```yaml
   - name: Show logs on failure
     if: failure()
     run: docker compose logs
   ```
3. Verify all services start correctly locally

### Issue 7: Act (Local Testing) Issues

**Symptom**:
```
Error: Docker daemon not available
```

**Solution**:
1. Start Docker Desktop
2. Verify Docker is running: `docker ps`
3. Run act with `-v` flag for verbose output:
   ```bash
   act -W .github/workflows/ci.yml -v
   ```

### Issue 8: Quality Gate Takes Too Long

**Symptom**:
Quality Gate check times out after 5 minutes

**Solution**:
1. Increase timeout in `sonar.yml`:
   ```yaml
   - name: Wait for Quality Gate
     timeout-minutes: 10  # Increased from 5
   ```
2. Check SonarCloud server status: https://status.sonarcloud.io/

---

## Additional Resources

### Documentation

- **GitHub Actions**: https://docs.github.com/en/actions
- **SonarCloud**: https://docs.sonarcloud.io/
- **Docker Compose**: https://docs.docker.com/compose/
- **Pytest Coverage**: https://pytest-cov.readthedocs.io/

### Extensions

- **GitHub Actions** (VS Code): https://marketplace.visualstudio.com/items?itemName=github.vscode-github-actions
- **SonarLint** (VS Code): https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode

### Contact

- **Issues**: https://github.com/Linerror99/Mimo-core/issues
- **Documentation**: See [README.md](../README.md)

---

## Next Steps

After completing CI/CD setup:

1. ✅ Push to GitHub and verify CI runs
2. ✅ Check SonarCloud dashboard
3. ✅ Configure branch protection rules:
   - Require CI to pass before merge
   - Require SonarCloud Quality Gate
   - Require 1 review before merge
4. ✅ Set up notifications:
   - GitHub: Settings → Notifications
   - SonarCloud: Project Settings → Notifications
5. 🚀 Move to Sprint 8 Priority 7: Documentation

---

**Last Updated**: December 11, 2024  
**Version**: 1.0.0  
**Author**: Mimo Finance Team
