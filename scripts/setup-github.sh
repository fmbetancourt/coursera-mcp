#!/bin/bash

# Complete GitHub setup script for Coursera MCP
# Usage: ./scripts/setup-github.sh [github-username] [npm-token]
#
# This script will:
# 1. Create GitHub repository
# 2. Configure git remote
# 3. Push code to GitHub
# 4. Set up GitHub secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parameters
GITHUB_USERNAME="${1:-yourusername}"
NPM_TOKEN="${2}"
REPO_NAME="coursera-mcp"
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo -e "${YELLOW}Coursera MCP - GitHub Setup${NC}"
echo ""
echo "Configuration:"
echo "  Repository: $REPO_URL"
echo ""

# Validate inputs
if [ "$GITHUB_USERNAME" = "yourusername" ]; then
  echo -e "${RED}❌ Error: Please provide your GitHub username${NC}"
  echo "Usage: ./scripts/setup-github.sh YOUR_USERNAME [NPM_TOKEN]"
  exit 1
fi

if [ -z "$NPM_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  NPM_TOKEN not provided${NC}"
  echo "You can add it later with:"
  echo "  gh secret set NPM_TOKEN --body 'YOUR_TOKEN'"
  echo ""
fi

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
  echo "Install: https://cli.github.com/"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Step 1: Create repository
echo -e "${YELLOW}Step 1/4: Creating GitHub repository...${NC}"
if gh repo create "$REPO_NAME" --public --source=. --remote=origin --push 2>/dev/null; then
  echo -e "${GREEN}✓ Repository created${NC}"
else
  echo -e "${YELLOW}⚠️  Repository might already exist${NC}"
  echo "Verifying remote configuration..."

  # Check if remote exists
  if git remote get-url origin &>/dev/null; then
    echo -e "${GREEN}✓ Remote already configured${NC}"
  else
    echo "Adding remote..."
    git remote add origin "$REPO_URL"
    git branch -M main
    git push -u origin main
    echo -e "${GREEN}✓ Remote added and pushed${NC}"
  fi
fi

echo ""

# Step 2: Verify push
echo -e "${YELLOW}Step 2/4: Verifying repository push...${NC}"
if git remote -v | grep -q origin; then
  echo -e "${GREEN}✓ Remote verified${NC}"
else
  echo -e "${RED}❌ Remote not found${NC}"
  exit 1
fi

echo ""

# Step 3: Configure secrets
echo -e "${YELLOW}Step 3/4: Configuring GitHub secrets...${NC}"

# NPM_TOKEN
if [ -n "$NPM_TOKEN" ]; then
  echo "Setting NPM_TOKEN..."
  if gh secret set NPM_TOKEN --body "$NPM_TOKEN"; then
    echo -e "${GREEN}✓ NPM_TOKEN configured${NC}"
  else
    echo -e "${RED}❌ Failed to set NPM_TOKEN${NC}"
    echo "Try manually: gh secret set NPM_TOKEN"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping NPM_TOKEN (not provided)${NC}"
  echo "Set later with: gh secret set NPM_TOKEN --body 'YOUR_TOKEN'"
fi

echo ""

# CODECOV_TOKEN (optional)
echo "Set Codecov token (optional):"
echo "  1. Go to https://codecov.io/"
echo "  2. Get your repo token"
echo "  3. Run: gh secret set CODECOV_TOKEN"

echo ""

# Step 4: Verify configuration
echo -e "${YELLOW}Step 4/4: Verifying configuration...${NC}"

# Check if workflows are available
if [ -f ".github/workflows/ci.yml" ]; then
  echo -e "${GREEN}✓ CI/CD workflow found${NC}"
else
  echo -e "${YELLOW}⚠️  CI/CD workflow not found${NC}"
fi

# Check secrets
SECRETS=$(gh secret list 2>/dev/null || echo "")
if echo "$SECRETS" | grep -q "NPM_TOKEN"; then
  echo -e "${GREEN}✓ NPM_TOKEN secret configured${NC}"
else
  echo -e "${YELLOW}⚠️  NPM_TOKEN secret not configured${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}✅ GitHub setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "2. Wait for CI/CD workflow to complete"
echo "3. Check Actions tab for build status"
echo ""
echo "Create v1.1 roadmap issues:"
echo "  ./scripts/create-v1.1-roadmap.sh"
echo ""
echo "Monitor releases:"
echo "  gh release list"
echo ""
echo "Install from npm (after release):"
echo "  npm install -g coursera-mcp"
