# Changelog

All notable changes to this project will be documented in this file.

# 1.0.0 (2026-05-05)


### Bug Fixes

* resolve test failures and improve cache persistence ([13d88e0](https://github.com/fmbetancourt/coursera-mcp/commit/13d88e0c777f9ffa83e97649dd9f8915503e19ed))
* Resolve yourusername placeholder issue at root level ([c97bafe](https://github.com/fmbetancourt/coursera-mcp/commit/c97bafe1b6d4d92a85e112caab102e8c0effb32a))


### Features

* complete foundational configuration (T1.2-T1.6) ([8a0a290](https://github.com/fmbetancourt/coursera-mcp/commit/8a0a29012c32db27d8d403a9a8a55841c0e5c334))
* create type system and schemas (T1.7-T1.9) ([49e7e80](https://github.com/fmbetancourt/coursera-mcp/commit/49e7e8027256abe64ef432c972c763560e6d60c2))
* implement core utilities and services (T1.10-T1.13) ([aa8df87](https://github.com/fmbetancourt/coursera-mcp/commit/aa8df87d19404064add365a0eb2ca71befa193bb))
* implement encryption and TOTP 2FA (T1.21-T1.24) ([0d1dd02](https://github.com/fmbetancourt/coursera-mcp/commit/0d1dd02f15e845c6a95eff620a7e2c50c4948a67))
* implement HTTP client and core services (T1.14-T1.16) ([3022eff](https://github.com/fmbetancourt/coursera-mcp/commit/3022eff7f25f6028743ff8c264c553da7d902bf5))
* initialize project architecture and comprehensive design documentation ([c65fa2d](https://github.com/fmbetancourt/coursera-mcp/commit/c65fa2dc5ed838f78a603bb4bc60dceaf52a61a2))
* T1.25 HTTP+Cache integration tests ([70315e4](https://github.com/fmbetancourt/coursera-mcp/commit/70315e4349cdb0b355c3fd572e3800dd41800fc3))
* T1.26 Auth flow integration tests with TOTP ([6d8c2f6](https://github.com/fmbetancourt/coursera-mcp/commit/6d8c2f686e6d4e80bd15a30ad331712fea86dcb7))
* T1.27 Circuit breaker integration tests with fallback ([d4d72ff](https://github.com/fmbetancourt/coursera-mcp/commit/d4d72ff22e9aff6153541c7eae379c16fe1d4d3d))
* T1.28 T1.29 Parser service with Zod validation and unit tests ([93de87f](https://github.com/fmbetancourt/coursera-mcp/commit/93de87ffc8e74693a570c5d36f445087b6ae7d96))
* T1.30 MCP server base with service initialization and type fixes ([58d77e3](https://github.com/fmbetancourt/coursera-mcp/commit/58d77e39a5330616428e20ed1275fae4ec2587cc))
* T2.1 T2.2 T2.3 Search tools (courses and programs) with integration tests ([70df7da](https://github.com/fmbetancourt/coursera-mcp/commit/70df7da6bbe8afd8b9e55f447b0ab30203ec4826))
* T2.4 T2.5 T2.6 Details tools (courses and programs) with integration tests ([e6b5834](https://github.com/fmbetancourt/coursera-mcp/commit/e6b58347807401e6f542ca19021389993a54181e))
* T2.7 Register search and details tools in MCP server ([c3c013f](https://github.com/fmbetancourt/coursera-mcp/commit/c3c013f4d116c9b2578fa2f98f38baab86eacda9))
* T2.8 T2.9 E2E tests and API documentation for public tools ([3496567](https://github.com/fmbetancourt/coursera-mcp/commit/349656774942d9f0a7c81e4664e6a5914a968256))
* T3.4 create auth middleware with session management ([e1474e6](https://github.com/fmbetancourt/coursera-mcp/commit/e1474e6ca70cbe29a2cb6f6961f8bd7c96203b24))
* T3.5-T3.6 create comprehensive integration tests for enrolled and recommendations tools ([85f93f1](https://github.com/fmbetancourt/coursera-mcp/commit/85f93f15036489c68eef08279e357993e63aa100))
* T3.7 register private tools in MCP server with auth middleware ([5ff3d45](https://github.com/fmbetancourt/coursera-mcp/commit/5ff3d45fbc049997412e6ce984d1d3fbf872632e))
* T3.8 implement session refresh automation ([d5eb16f](https://github.com/fmbetancourt/coursera-mcp/commit/d5eb16fa917b7417917c015004f3194c186785fb))
* T4.1 create GitHub Actions CI/CD workflow ([9bda042](https://github.com/fmbetancourt/coursera-mcp/commit/9bda042f000bce164c3e113ade297235f196966e))
* T4.11-T4.17 finalize Phase 4 documentation and release prep ([e1c6104](https://github.com/fmbetancourt/coursera-mcp/commit/e1c6104f59ba45bc77cc91e098690fcbd397989b))
* T4.2 configure semantic-release for npm publishing ([e66355c](https://github.com/fmbetancourt/coursera-mcp/commit/e66355c8a23f16cf300dc1b165b031c9467c0c8f))
* T4.3 configure Codecov for coverage tracking ([6ee9aa4](https://github.com/fmbetancourt/coursera-mcp/commit/6ee9aa4cf953b1c09c808b49db0cb44bfa05875c))
* T4.8 configure esbuild for bundled executable ([7e556ac](https://github.com/fmbetancourt/coursera-mcp/commit/7e556ac22402f8f6c41d757a16f31c13f91bdf48))
* T4.9 create CLI binary entry point ([c00310c](https://github.com/fmbetancourt/coursera-mcp/commit/c00310c9a6664f356928b4e03b702330c38bbfd9))

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
