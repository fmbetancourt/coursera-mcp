# GitHub Repository Setup Guide

This guide explains how to set up the Coursera MCP repository on GitHub with proper CI/CD configuration.

## Prerequisites

- GitHub account
- GitHub CLI installed (`gh`)
- Git configured with your GitHub credentials

## Step 1: Create GitHub Repository

### Option A: Via GitHub Web UI

1. Go to [GitHub New Repository](https://github.com/new)
2. Repository name: `coursera-mcp`
3. Description: "Model Context Protocol server integrating Coursera with Claude AI"
4. Visibility: Public
5. Click "Create repository"

### Option B: Via GitHub CLI

```bash
gh repo create coursera-mcp \
  --public \
  --source=. \
  --remote=origin \
  --push
```

## Step 2: Add Remote and Push Code

### Configure remote (if not done via CLI):

```bash
git remote add origin https://github.com/fmbetancourt/coursera-mcp.git
git branch -M main
git push -u origin main
```

### Verify push:

```bash
git remote -v
# Should show:
# origin  https://github.com/fmbetancourt/coursera-mcp.git (fetch)
# origin  https://github.com/fmbetancourt/coursera-mcp.git (push)
```

## Step 3: Configure GitHub Secrets

GitHub Actions needs these secrets for CI/CD to work:

### Get NPM Token

1. Go to [npm tokens](https://www.npmjs.com/settings/~/tokens)
2. Create "Automation" token
3. Copy the token

### Add NPM_TOKEN Secret

```bash
gh secret set NPM_TOKEN --body "YOUR_NPM_TOKEN_HERE"
```

Or via GitHub Web UI:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: `npm_xxxxx...` (your automation token)
5. Click "Add secret"

### (Optional) Add CODECOV_TOKEN Secret

1. Go to [Codecov](https://codecov.io/)
2. Connect GitHub account
3. Select your repository
4. Copy the token from settings
5. Add as GitHub secret:

```bash
gh secret set CODECOV_TOKEN --body "YOUR_CODECOV_TOKEN"
```

Or via GitHub Web UI (same as NPM_TOKEN above)

## Step 4: Configure Branch Protection

Protects `main` branch to require PR reviews before merging:

### Via GitHub CLI

```bash
gh api repos/fmbetancourt/coursera-mcp/branches/main/protection \
  -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["build","test","coverage"]}' \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  -f enforce_admins=true
```

### Via GitHub Web UI

1. Go to **Settings** → **Branches**
2. Add rule for `main`
3. Enable:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Dismiss stale pull requests
   - ✅ Include administrators

## Step 5: Configure GitHub Pages (Optional)

To host documentation at `fmbetancourt.github.io/coursera-mcp`:

1. Go to **Settings** → **Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` → `/docs` folder
4. Save

Then documentation will be at: `https://fmbetancourt.github.io/coursera-mcp/`

## Step 6: Add GitHub Topics (Optional)

Go to repository **Settings** and add topics:
- `mcp`
- `model-context-protocol`
- `coursera`
- `claude`
- `ai`
- `education`
- `typescript`

## Step 7: Verify CI/CD

After pushing code, verify workflows:

1. Go to **Actions** tab
2. Should see "CI/CD Pipeline" running
3. Wait for completion (usually 3-5 minutes)
4. All checks should pass (✅)

Monitor the first run:

```bash
gh run list --workflow=ci.yml
```

Watch live:

```bash
gh run watch --repo fmbetancourt/coursera-mcp
```

## GitHub Secrets Reference

### Required Secrets

| Secret | Purpose | How to Get |
|--------|---------|-----------|
| `NPM_TOKEN` | Publish to npm | [npm tokens](https://www.npmjs.com/settings/~/tokens) |

### Optional Secrets

| Secret | Purpose | How to Get |
|--------|---------|-----------|
| `CODECOV_TOKEN` | Upload coverage reports | [Codecov](https://codecov.io/) |
| `GITHUB_TOKEN` | Auto-generated | Included by default |

## Troubleshooting

### CI/CD Not Running

1. Check if `.github/workflows/ci.yml` exists
2. Check if file is properly committed
3. Verify branch name is `main` (or update workflow)
4. Check Actions permissions in Settings

### Build Fails on npm Publish

1. Verify `NPM_TOKEN` is set correctly
2. Ensure token is "Automation" type (not "Read-only")
3. Check npm account has no 2FA enabled for CI
4. Verify package.json version is correct

### Coverage Not Uploading

1. Generate coverage: `bun run test:coverage`
2. Verify coverage files are created
3. Ensure `CODECOV_TOKEN` is set (if using Codecov)
4. Check Codecov repository settings

## First Release Workflow

Once GitHub is properly configured:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: Initial release setup"
   git push origin main
   ```

2. **Wait for CI to pass** (5-10 minutes)

3. **Create a release tag:**
   ```bash
   git tag -a v0.1.0 -m "Release version 0.1.0"
   git push origin v0.1.0
   ```

4. **semantic-release will:**
   - Analyze commits
   - Generate CHANGELOG
   - Bump version in package.json
   - Publish to npm
   - Create GitHub Release

5. **Verify:**
   ```bash
   npm info coursera-mcp  # Check npm
   gh release list        # Check GitHub releases
   ```

## Continuous Integration Flow

```
1. Push to main
   ↓
2. GitHub Actions triggers CI/CD pipeline
   ↓
3. Tests run on Node 18.x and 20.x
   ↓
4. Coverage checked (must be ≥85%)
   ↓
5. All checks pass ✅
   ↓
6. semantic-release analyzes commits
   ↓
7. If feat/fix found:
   - Update version
   - Generate CHANGELOG
   - Publish to npm
   - Create GitHub Release
```

## Repository Settings Checklist

- [ ] Repository created and pushed
- [ ] `NPM_TOKEN` secret configured
- [ ] (Optional) `CODECOV_TOKEN` secret configured
- [ ] Branch protection enabled on `main`
- [ ] GitHub Pages configured (optional)
- [ ] Topics added
- [ ] README visible on GitHub
- [ ] All workflows passing (✅)

## Next Steps

Once GitHub is set up:

1. **Monitor your first release:**
   ```bash
   gh run list --workflow=ci.yml -L 1
   ```

2. **Check npm publication:**
   ```bash
   npm info coursera-mcp
   ```

3. **View GitHub Release:**
   ```bash
   gh release list
   ```

4. **Install from npm:**
   ```bash
   npm install -g coursera-mcp
   ```

---

**For help with GitHub:**
- [GitHub Docs](https://docs.github.com/)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [semantic-release Docs](https://semantic-release.gitbook.io/)
