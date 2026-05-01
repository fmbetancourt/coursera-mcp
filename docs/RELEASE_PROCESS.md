# Release Process Guide

This document outlines the automated release process for Coursera MCP using semantic-release.

## Overview

Coursera MCP uses **semantic-release** for fully automated versioning and npm publishing:

```
Code Commit → Analyze → Version Bump → Generate Changelog → npm Publish → GitHub Release
```

No manual version management needed! The release happens automatically based on commit messages.

## Versioning Strategy

Versioning follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  ↓     ↓      ↓
  3     2      5  (v3.2.5)
```

### Version Bump Rules

- **MAJOR** (3.0.0) - Breaking changes
  - Triggers: `BREAKING CHANGE:` in commit footer
  - Example: Removing a public API

- **MINOR** (2.1.0) - New features, backward compatible
  - Triggers: `feat:` commits
  - Example: Add new tool, enhance existing feature

- **PATCH** (2.0.1) - Bug fixes only
  - Triggers: `fix:` commits
  - Example: Fix bug in authentication

### Examples

```
feat: Add CSV export tool
→ Bump MINOR (0.1.0 → 0.2.0)

fix: Correct session expiration check
→ Bump PATCH (0.1.0 → 0.1.1)

BREAKING CHANGE: Remove get_recommendations API
→ Bump MAJOR (0.1.0 → 1.0.0)
```

## Commit Message Format

All commits must follow **conventional commits**:

```
<type>(<scope>): <description>

<body>

<footer>
```

### Types

- `feat:` - New feature (triggers MINOR)
- `fix:` - Bug fix (triggers PATCH)
- `docs:` - Documentation only
- `style:` - Code style (no functional change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Test changes
- `chore:` - Build/tooling changes

### Examples

```
feat: Add course comparison tool

Implement side-by-side course comparison with syllabus, 
pricing, and review comparisons. Closes #42.

feat(search): Add filter by duration

Allow filtering courses by duration range (1-12 weeks).
```

```
fix: Correct session token expiration

Previously checked expiration incorrectly with timezone-naive 
timestamps. Now uses UTC consistently.

Fixes #99
```

## Release Workflow

### Automated Flow (Most Common)

```
1. Developer commits with conventional message
   git commit -m "feat: Add new feature"
   
2. Push to main branch
   git push origin main
   
3. GitHub Actions CI/CD runs
   - Type check
   - Lint
   - Tests (85%+ coverage required)
   
4. If all checks pass, semantic-release runs
   - Analyzes commits since last release
   - Determines version bump
   - Updates package.json version
   - Generates CHANGELOG.md
   - Commits changes
   - Tags commit with version
   - Publishes to npm
   - Creates GitHub Release
   
5. New version available on npm
   npm install -g coursera-mcp@latest
```

### Manual Pre-Release (If Needed)

For release candidates (alpha, beta):

```bash
# Create pre-release branch
git checkout -b release/v0.2.0-rc.1

# Commit changes with pre-release flag
git commit -m "chore: Release v0.2.0-rc.1"

# semantic-release will:
# - Publish as coursera-mcp@0.2.0-rc.1
# - Mark as "Pre-release" on GitHub
# - NOT set as latest release
```

## Semantic-Release Configuration

See `release.config.js` for details:

```javascript
export default {
  branches: ['main', 'develop'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
};
```

### Branches

- **main**: Production releases (published)
- **develop**: Integration branch (not published)

## Release Checklist

Before pushing to main:

- [ ] All tests pass locally: `bun test`
- [ ] Coverage ≥85%: `bun run test:coverage`
- [ ] Type check passes: `bun run type-check`
- [ ] Linting passes: `bun run lint`
- [ ] Code reviewed by team member
- [ ] Documentation updated
- [ ] Commit messages follow conventional format

## Release Monitoring

### Watch CI/CD

```bash
# List recent runs
gh run list --workflow=ci.yml

# Watch live
gh run watch --repo fmbetancourt/coursera-mcp

# View specific run details
gh run view {run_id} --log
```

### Check npm Publication

```bash
# View on npm
npm info coursera-mcp

# Check specific version
npm info coursera-mcp@0.1.0

# Install specific version
npm install -g coursera-mcp@0.1.0
```

### Check GitHub Release

```bash
# List releases
gh release list

# View specific release
gh release view v0.1.0

# Check release notes
gh release view v0.1.0 --json body
```

## Rollback (Emergency)

If a release has critical issues:

### Immediate Workaround

```bash
# Install previous version
npm install -g coursera-mcp@previous-version
```

### Proper Rollback

1. **Revert the commit:**
   ```bash
   git revert {commit-hash}
   git push origin main
   ```

2. **semantic-release will:**
   - Analyze the revert commit
   - Bump PATCH version (for revert)
   - Publish the reverted version

3. **Release notes will show:** "Revert: ..."

### Update GitHub Release

```bash
# Mark previous release as latest
gh release edit v0.1.1 --latest
```

## Hotfix Release

For critical production fixes:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# Make fix
git commit -m "fix: Critical authentication bug

Patches security issue in session validation.
Fixes #150"

# Push and create PR
git push origin hotfix/critical-bug
gh pr create --base main --head hotfix/critical-bug

# After approval and merge:
# semantic-release will:
# - Bump PATCH
# - Publish immediately
# - Create hotfix release
```

## Release Notes Example

Generated automatically in CHANGELOG.md:

```markdown
## [0.2.0] - 2026-05-15

### Added
- 🎯 New feature: CSV export functionality
- 📊 Performance improvements to search

### Fixed
- 🐛 Session token expiration check
- 🔐 Security: Improve log sanitization

### Changed
- ⚙️ Refactored cache service for better performance
```

## Troubleshooting

### Release Didn't Happen

**Check commit messages:**
```bash
# View last commits
git log --oneline -10

# Must be: feat:, fix:, BREAKING CHANGE:
# NOT: feat (missing colon), chore:, or other
```

**Verify branch:**
```bash
git branch -a
# Must be on 'main' branch
```

### Wrong Version Bumped

Check the commit type:
- `feat:` should bump MINOR (0.1.0 → 0.2.0)
- `fix:` should bump PATCH (0.1.0 → 0.1.1)
- Add `BREAKING CHANGE:` footer to bump MAJOR

### npm Publish Failed

1. **Check NPM_TOKEN:**
   ```bash
   gh secret list
   # Should show NPM_TOKEN
   ```

2. **Verify token is valid:**
   - Go to https://www.npmjs.com/settings/~/tokens
   - Check token hasn't expired
   - Regenerate if needed

3. **Check package name:**
   - Must not already exist on npm
   - Must be unique

### GitHub Release Not Created

1. **Check GITHUB_TOKEN:**
   - Is automatic (created by GitHub)
   - Permissions should be "full access"

2. **Verify release.config.js:**
   - Must include '@semantic-release/github' plugin

## Performance Notes

Release automation timing:

- **Type check**: 5-10 seconds
- **Linting**: 3-5 seconds
- **Tests**: 10-15 seconds
- **Coverage**: 2-3 seconds
- **npm publish**: 10-20 seconds
- **GitHub Release**: 5-10 seconds

**Total CI/CD time: 3-5 minutes**

## Security

### What's Automated

✅ **Can be automated:**
- Version bumping
- CHANGELOG generation
- npm publishing
- GitHub release creation

### What's Manual

❌ **Never automated:**
- Code review (humans review before merge)
- Security audit
- Documentation updates (tracked in commits)

### Token Security

- `NPM_TOKEN` - Only used by semantic-release
- `GITHUB_TOKEN` - Auto-generated by GitHub
- Tokens only available to CI/CD pipeline
- Not visible in logs or build output

## Best Practices

1. **Always use conventional commits**
   ```bash
   # ✅ Good
   git commit -m "feat: Add dark mode support"
   
   # ❌ Bad
   git commit -m "Update styling"
   ```

2. **Keep commits atomic**
   - One feature per commit
   - Makes CHANGELOG clear
   - Easier to revert if needed

3. **Reference issues in commits**
   ```bash
   git commit -m "fix: Login error

   Closes #42"
   ```

4. **Review before merge**
   - PR review required on main
   - Verify commit messages
   - Check test coverage

5. **Monitor releases**
   - Watch first few releases
   - Verify npm package
   - Check GitHub release notes

## Release Calendar

Recommended release cadence:

- **Patch fixes**: As needed (critical bugs)
- **Feature releases**: Every 2-4 weeks
- **Major releases**: Quarterly (breaking changes)

Example:
- v0.1.0 - Initial release
- v0.1.1 - Critical hotfix
- v0.2.0 - Feature release
- v1.0.0 - Major release (breaking changes)

## FAQ

**Q: Can I skip the automated release?**

A: Yes, commit without conventional message (e.g., "chore:"). Release won't trigger.

**Q: Can I release manually?**

A: No, semantic-release only runs on main branch CI/CD. This ensures consistency.

**Q: What if I make a mistake in the commit message?**

A: Revert the commit with another conventional commit (`git revert`), which will release the revert.

**Q: How do I handle multiple unreleased commits?**

A: All unreleased commits are analyzed together. If one is `feat:`, MINOR bumps. If multiple `fix:`, still PATCH.

**Q: Can I have pre-releases?**

A: Yes, use pre-release branches. Configure in release.config.js.

---

**For more details:**
- [semantic-release docs](https://semantic-release.gitbook.io/)
- [conventional commits](https://www.conventionalcommits.org/)
- [CHANGELOG.md](../CHANGELOG.md) for previous releases
