# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-01

### Added

- **Initial Release** - Coursera MCP v0.1.0
- **7 Tools Implemented**
  - Public: `search_courses`, `search_programs`, `get_course_details`, `get_program_details`
  - Private: `get_enrolled_courses`, `get_progress`, `get_recommendations`
- **Security Features**
  - TOTP 2FA (Time-based One-Time Password) authentication
  - AES-256-GCM encryption for session tokens
  - Credential sanitization in logs
  - Local session storage (`~/.coursera-mcp/sessions.json`)
- **Resilience**
  - Circuit breaker pattern for API protection
  - Stale-while-revalidate (SWR) caching strategy
  - Exponential backoff retry logic
  - Automatic session refresh
- **Data Validation**
  - Zod runtime schema validation
  - Type-safe error handling (discriminated unions)
  - API response validation
- **Testing**
  - 326 unit & integration tests
  - 85%+ code coverage
  - Comprehensive test fixtures
  - E2E user workflow tests
- **CI/CD**
  - GitHub Actions workflow (Node 18.x, 20.x)
  - semantic-release for automated npm publishing
  - Codecov integration for coverage tracking
  - Automated version management
- **Documentation**
  - API specification (API.md)
  - Development guide (DEVELOPMENT.md)
  - Security guide for users (SECURITY_USERS.md)
  - Contributing guidelines (CONTRIBUTING.md)
  - Project README
  - Code examples and quick start

### Technical Details

**Architecture:**
- Layered, service-oriented design
- Clean Architecture principles
- SOLID design principles

**Services:**
- `CourseraClient`: HTTP client with circuit breaker
- `CacheService`: TTL-based caching with SWR
- `AuthService`: TOTP 2FA + session management
- `EncryptionService`: AES-256-GCM encryption
- `Parser`: Zod validation + type parsing

**Performance:**
- Cache hits: <5ms
- Cache misses: 300-1000ms (Coursera API latency)
- Memory footprint: <50MB
- Circuit breaker auto-recovery: 60s

**Testing Coverage:**
- Unit tests: 75% (mocked services)
- Integration tests: 24% (combined services)
- E2E tests: 1% (full workflows)
- Overall coverage: 85%+

### Browser & Environment

- **Node.js:** >= 18.0.0
- **Bun:** >= 1.0.0
- **Platform:** macOS, Linux, Windows
- **Bundle Size:** 557KB (minified, with source maps)

## Roadmap

### v0.1.1 (Planned)
- Bug fixes and performance improvements
- Enhanced error messages
- Additional test coverage

### v1.0 (Q3 2026 Planned)
- 2FA backup codes UI
- Export progress to CSV
- Google Calendar sync
- Course comparison tool
- Study group finder
- ML-based recommendations

### v2.0+ (Future)
- Mobile app support
- Browser extension
- Real-time collaboration
- Advanced analytics
- Integration with other learning platforms

---

**For more details, see [docs/](docs/) directory and [GitHub Releases](https://github.com/yourusername/coursera-mcp/releases).**
