# Coursera MCP

[![CI/CD Pipeline](https://github.com/fmbetancourt/coursera-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/fmbetancourt/coursera-mcp/actions)
[![Coverage Status](https://codecov.io/gh/fmbetancourt/coursera-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/fmbetancourt/coursera-mcp)
[![npm version](https://badge.fury.io/js/coursera-mcp.svg)](https://badge.fury.io/js/coursera-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A Model Context Protocol (MCP) server integrating Coursera with Claude AI.** Access courses, programs, enrollment data, and personalized recommendations directly within Claude conversations.

## Features

**7 Powerful Tools:**

### Public Tools (No Authentication)
- 🔍 **search_courses** - Search for courses with filters (level, language, sorting)
- 🎯 **search_programs** - Find specializations, degrees, and certificates
- 📚 **get_course_details** - Comprehensive course information (syllabus, instructors, skills)
- 🏆 **get_program_details** - Full program details with course curriculum

### Private Tools (TOTP 2FA Required)
- 📖 **get_enrolled_courses** - List your enrolled courses with progress
- 📊 **get_progress** - Detailed progress tracking (current week, upcoming deadlines)
- 🎓 **get_recommendations** - AI-powered course recommendations based on your learning

## Installation

### Prerequisites
- Node.js >= 18.0.0
- Claude Desktop (for desktop integration)
- Or use directly with Claude API

### Via npm

```bash
npm install -g coursera-mcp
```

### From Source

```bash
git clone https://github.com/fmbetancourt/coursera-mcp.git
cd coursera-mcp
bun install
bun run build
npm link
```

## Quick Start

### 1. Initial Setup

```bash
coursera-mcp init
```

This will:
- Prompt for your Coursera email
- Display a QR code for 2FA setup (Google Authenticator, Authy, 1Password, etc.)
- Save encrypted session token to `~/.coursera-mcp/sessions.json`

### 2. Use with Claude

#### In Claude Desktop

Add to your Claude configuration (`~/.claude/claude.json`):

```json
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp"
    }
  }
}
```

Restart Claude Desktop → Coursera tools available in conversations

#### Via Claude API

```python
from anthropic import Anthropic

client = Anthropic()
# MCP servers configured in your environment
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[...],  # MCP tools injected
    messages=[{
        "role": "user",
        "content": "Find Python beginner courses"
    }]
)
```

## Usage Examples

### Search for Courses

**In Claude:**
> "Find beginner Python courses with at least 4.5 star rating"

**Tool Call:**
```
search_courses({
  query: "Python",
  level: "beginner",
  sortBy: "rating",
  sortOrder: "desc"
})
```

**Response:**
```
{
  items: [
    {
      id: "python-basics",
      name: "Python for Everybody",
      rating: 4.8,
      enrollments: 250000,
      duration: 8,
      level: "beginner"
    },
    ...
  ],
  total: 1250,
  hasMore: true
}
```

### Get Course Details

```
get_course_details({
  courseId: "python-for-data-science"
})
```

### Check Your Progress

```
get_progress({
  courseId: "machine-learning-specialization"
})

→ {
  percent: 65,
  currentWeek: 7,
  totalWeeks: 10,
  upcomingDeadlines: [
    {
      week: 7,
      dueDate: "2026-05-15T23:59:59Z",
      type: "quiz"
    }
  ]
}
```

### Get Personalized Recommendations

```
get_recommendations({
  limit: 10,
  includeCourses: true,
  includePrograms: true
})

→ {
  recommendations: [
    {
      name: "Advanced Machine Learning",
      matchScore: 92,
      reason: "You've completed Python and Data Science basics",
      difficulty: "advanced",
      rating: 4.8
    },
    ...
  ]
}
```

## Security

### 2FA Authentication

- **TOTP-based** - Industry-standard Time-based One-Time Password (Google Authenticator, Authy, etc.)
- **Credentials never stored** - Email/password only used during setup
- **Encrypted tokens** - AES-256-GCM encryption for session storage
- **Auto-refresh** - Sessions automatically refreshed before expiration

### Privacy

- **No logging of sensitive data** - Tokens, emails, passwords are automatically redacted
- **Local session storage** - `~/.coursera-mcp/sessions.json` (chmod 0o600)
- **No data collection** - All data stays on your machine

See [SECURITY.md](docs/SECURITY_USERS.md) for detailed security information.

## Documentation

- **[API.md](docs/API.md)** - Complete tool specifications with examples
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Architecture and development guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[CHANGELOG.md](CHANGELOG.md)** - Release history

## Status

### Implemented (v0.1.0)
- ✅ All 7 tools functional
- ✅ TOTP 2FA authentication
- ✅ AES-256 encryption
- ✅ Circuit breaker resilience
- ✅ Stale-while-revalidate caching
- ✅ 85%+ test coverage
- ✅ GitHub Actions CI/CD

### Roadmap (v1.0+)

- [ ] 2FA backup codes UI
- [ ] Export progress to CSV
- [ ] Google Calendar sync
- [ ] Course comparison tool
- [ ] Study group finder
- [ ] Learning path recommendations

See [GitHub Issues](https://github.com/fmbetancourt/coursera-mcp/issues) for roadmap details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style and standards
- Testing requirements
- Pull request process
- Commit message format

## Troubleshooting

### "No active session" error

**Solution:** Run `coursera-mcp init` to authenticate

### Session expired

**Solution:** The session will auto-refresh automatically. If it fails, run `coursera-mcp init` again

### Certificate errors on macOS

**Solution:** Ensure you have the latest Bun version: `bun upgrade`

## Performance

- **Cache hit:** <5ms response time
- **Cache miss:** 300-1000ms (Coursera API latency)
- **Circuit breaker:** Auto-recovers in 60 seconds if API down
- **Memory:** <50MB footprint

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Watch mode
bun run dev
```

## License

MIT © 2026 Freddy Betancourt

## Support

- 📖 Check [documentation](docs/)
- 🐛 [Report issues](https://github.com/fmbetancourt/coursera-mcp/issues)
- 💬 [Start a discussion](https://github.com/fmbetancourt/coursera-mcp/discussions)

---

**Built with** ❤️ **by the Coursera MCP team**

Made for Claude AI and the community.
