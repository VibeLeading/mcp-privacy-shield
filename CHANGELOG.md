# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-31

### Added

- Initial release: MCP server over stdio with `StdioServerTransport`.
- `sanitize_text` tool: regex-based PII redaction to tokens or category masks.
- `classify_zone` tool: tiered sovereignty classification (public/internal/restricted/vault).
- `compliance_check` tool: 0-100 compliance scoring with violations listing.
- `shield_catalog` tool: list supported patterns and env configuration.
- Opt-in capitalized-name pseudonymization via `MCP_SHIELD_NAMES=1`.
