#!/bin/bash

# Script to create GitHub issues for v1.1 roadmap
# Usage: ./scripts/create-v1.1-roadmap.sh
#
# This script requires:
# - GitHub CLI (gh) installed and authenticated
# - Repository set up and pushed to GitHub
# - Repository in yourusername/coursera-mcp format

set -e

REPO="${GITHUB_REPOSITORY:-yourusername/coursera-mcp}"
PROJECT_LABEL="v1.1-roadmap"
MILESTONE="v1.0"

echo "Creating v1.1 roadmap issues for $REPO..."

# Issue 1: 2FA Backup Codes UI
gh issue create \
  --repo "$REPO" \
  --title "Feature: 2FA Backup Codes UI" \
  --body "## Description
Implement user interface for managing 2FA backup codes.

## Requirements
- Generate backup codes during 2FA setup
- Display codes with download/copy options
- Allow regenerating codes
- Provide backup code verification flow

## Acceptance Criteria
- [ ] Backup codes displayed during 2FA setup
- [ ] Download codes as .txt file
- [ ] Copy individual codes to clipboard
- [ ] Regenerate codes command
- [ ] Tests for backup code flow

## Estimated Size
Medium (~8h)

## Related Issues
Depends on: TOTP 2FA implementation (v0.1.0)" \
  --label "enhancement,v1.1-roadmap,security" \
  --milestone "$MILESTONE"

# Issue 2: Export Progress to CSV
gh issue create \
  --repo "$REPO" \
  --title "Feature: Export Progress to CSV" \
  --body "## Description
Allow users to export their enrollment progress data to CSV format.

## Requirements
- Export enrolled courses data
- Include progress metrics (completion %, current week)
- Export individual course progress details
- Include deadline information
- Support filtering by course status

## Acceptance Criteria
- [ ] Export all enrolled courses as CSV
- [ ] CSV includes course name, progress %, completion date
- [ ] Individual course progress export
- [ ] Deadlines included in export
- [ ] Tests for CSV generation

## Estimated Size
Medium (~6h)

## Related Issues
Requires: get_enrolled_courses, get_progress tools (v0.1.0)" \
  --label "enhancement,v1.1-roadmap" \
  --milestone "$MILESTONE"

# Issue 3: Google Calendar Sync
gh issue create \
  --repo "$REPO" \
  --title "Feature: Google Calendar Sync" \
  --body "## Description
Integrate with Google Calendar to sync course deadlines and milestones.

## Requirements
- OAuth 2.0 integration with Google Calendar
- Sync course deadlines to calendar events
- Update calendar on progress changes
- Allow users to select which courses to sync
- Bi-directional sync (optional for v1.0)

## Acceptance Criteria
- [ ] Google Calendar OAuth flow
- [ ] Sync deadlines as calendar events
- [ ] Color-coded by course
- [ ] Update on progress changes
- [ ] Sync settings management
- [ ] Tests for calendar integration

## Estimated Size
Large (~16h)

## Dependencies
- Google Calendar API
- OAuth 2.0 library

## Related Issues
Requires: get_progress tool (v0.1.0)" \
  --label "enhancement,v1.1-roadmap,integration" \
  --milestone "$MILESTONE"

# Issue 4: Course Comparison Tool
gh issue create \
  --repo "$REPO" \
  --title "Feature: Course Comparison Tool" \
  --body "## Description
Implement side-by-side course comparison with detailed metrics and recommendations.

## Requirements
- Compare up to 3 courses simultaneously
- Show syllabus, duration, rating, cost differences
- Display review summaries
- Show skill overlap/differences
- Recommendation based on differences

## Acceptance Criteria
- [ ] 1-3 course comparison view
- [ ] Side-by-side syllabus
- [ ] Duration and cost comparison
- [ ] Rating and review comparison
- [ ] Skill venn diagram
- [ ] Recommendation engine
- [ ] Tests for comparison logic

## Estimated Size
Large (~14h)

## Related Issues
Requires: get_course_details, search_courses tools (v0.1.0)" \
  --label "enhancement,v1.1-roadmap" \
  --milestone "$MILESTONE"

# Print confirmation
echo ""
echo "✅ v1.1 roadmap issues created successfully!"
echo ""
echo "Issues created:"
echo "1. 2FA Backup Codes UI"
echo "2. Export Progress to CSV"
echo "3. Google Calendar Sync"
echo "4. Course Comparison Tool"
echo ""
echo "View issues:"
echo "  gh issue list --repo $REPO --label v1.1-roadmap"
