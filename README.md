# mcp-privacy-shield

**The Privacy Shield** — the Sanitization Gate, Tiered Sovereignty, and Privacy HUD. Keeps identity out of the AI's hands, keeps the Vault on-premise, and monitors a live Compliance Score.

Implements the Privacy Shield server from the appendix of *Vibe Leading The AI*.

## What it does

- **Sanitization Gate** — replaces PII with tokens like `[EMAIL_01]` (or category masks like `[EMAIL]`). The AI understands the logic but never sees the identity.
- **Tiered Sovereignty** — classifies data into `public` / `internal` / `restricted` / `vault` zones. Restricted PII stays in the Vault on-premise; you bring the AI to the data, not the reverse.
- **Privacy HUD** — monitors a Compliance Score (0-100). Snap the connection if sensitive patterns start leaking into output.

## Install

```bash
npm install -g mcp-privacy-shield
```

Or run on demand with `npx`:

```bash
npx mcp-privacy-shield
# or run straight from the GitHub source (builds automatically):
npx -y github:VibeLeading/mcp-privacy-shield
```

## Requirements

- **Node.js >= 22** — required. The server is ESM-only and uses modern Node
  built-ins. On older Node versions the process fails to start, which MCP
  clients report generically as "connection closed".
- No other runtime dependencies — everything ships with the package.

## Client configuration

Add to your MCP client config (e.g. Claude Desktop, Cursor, or opencode):

```json
{
  "mcpServers": {
    "privacy-shield": {
      "command": "npx",
      "args": ["mcp-privacy-shield"]
    }
  }
}
```

## Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `sanitize_text` | `text: string`, `mask?: boolean` | Redact PII → tokens or masks. Returns redacted text, replacement map, triggered categories, and risk. |
| `classify_zone` | `text: string` | Classify into `public` / `internal` / `restricted` / `vault` with confidence and reasons. |
| `compliance_check` | `text: string`, `required_zone?: string` | Score 0-100, list violations, and report pass/fail. |
| `shield_catalog` | — | List supported patterns and env config (no secrets exposed). |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_SHIELD_NAMES` | `0` (off) | Set to `1` to enable capitalized-name pseudonymization (`[PERSON_N]`). High-confidence only, and **off by default** to avoid over-redaction. |
| `MCP_SHIELD_ACCOUNT_PATTERN` | `\b\d{8,17}\b` | Regex used to detect bank/routing account numbers. |

## Detected categories

- Emails, phone numbers, credit-card numbers, US SSNs, bank/routing account numbers, IPv4 addresses, URLs, and passport/ID patterns.
- Optionally, full personal names (two consecutive capitalized words) when `MCP_SHIELD_NAMES=1`.

## What this does NOT do

This server is a **gate, not a compliance guarantee**. Specifically:

- It is heuristic/deterministic regex matching; it can miss novel or obfuscated PII and can produce false positives.
- No Luhn validation, no OCR, no cross-referencing against business records.
- It does not encrypt, store, or transmit anything, and it does not itself enforce legal compliance (GDPR, HIPAA, CCPA, etc.).
- Before relying on it for regulated data, pair it with a human-reviewed policy and a real data-loss-prevention layer.

Use it as one layer in a defense-in-depth strategy — not as a substitute for professional compliance review.

## Publishing

Published to the npm registry via **OIDC trusted publishing** — no npm tokens stored
anywhere. Pushing a version tag triggers the `.github/workflows/publish.yml` workflow:

```bash
npm version patch -m "release: v%s"
git push origin main --follow-tags
```

- **One-time bootstrap.** The very first published version cannot use trusted
  publishing (the trust relationship attaches to an existing package). Publish
  `0.1.1` once manually (`npm publish` after `npm login`, or a short-lived
  publish-scoped token), then configure **Trusted Publisher** on npmjs.com → the
  package → Settings → Trusted publishing → GitHub Actions → owner
  `VibeLeading`, repo `mcp-privacy-shield`, workflow `publish.yml`, action
  `allow npm publish` (requires 2FA once per package).
- Requires **Node.js >= 22** and npm >= 11.5.1 on the runner (handled by the workflow).

## License & Attribution

MIT — Copyright (c) 2026 Jean Machuca (see [LICENSE](LICENSE)).

This server implements concepts from the book **_Vibe Leading The AI: The Corporate Race
Against Machines_** by Jean Machuca (ISBN 9798252505008, © 2026 Jean Machuca). The book
is copyrighted commercial material; this repository does not republish its text. Buy the
book at [https://vibeleading.org](https://vibeleading.org) or
[https://a.co/d/04L5YatK](https://a.co/d/04L5YatK). Author website: [jeanmachuca.com](https://jeanmachuca.com) · Support on GitHub Sponsors: [github.com/sponsors/jeanmachuca](https://github.com/sponsors/jeanmachuca). See [NOTICE](NOTICE).
