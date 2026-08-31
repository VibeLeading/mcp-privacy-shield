#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { sanitize, patterns } from "./redactor.js";
import { classify, compliance, type Zone } from "./sovereignty.js";

const server = new McpServer({
  name: "mcp-privacy-shield",
  version: "0.1.0",
});

server.tool(
  "sanitize_text",
  "Sanitize PII in text. By default replaces detected PII with category tokens " +
    "like [EMAIL_01]. With mask=true, uses plain category masks like [EMAIL]. " +
    "Returns the redacted text, the replacement map, triggered categories, and a risk level.",
  {
    text: z.string().describe("The text to sanitize."),
    mask: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, use category masks instead of numbered tokens."),
  },
  async ({ text, mask }) => {
    const { redacted, replacements, triggered, risk } = sanitize(text, { mask });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { redacted, replacements, triggered, risk },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const zoneSchema = z.enum(["public", "internal", "restricted", "vault"]);

server.tool(
  "classify_zone",
  "Classify text into a data sovereignty zone: public, internal, restricted, or vault. " +
    "Returns a zone, confidence, and the reasons driving the decision.",
  { text: z.string().describe("The text to classify.") },
  async ({ text }) => {
    const result = classify(text);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "compliance_check",
  "Score text 0-100 for compliance. Deductions for detected sensitive categories, " +
    "especially vault-level data. Optionally require a max zone; flag a violation if " +
    "the text's zone ranks higher. Returns score, violations, and passed.",
  {
    text: z.string().describe("The text to evaluate."),
    required_zone: zoneSchema
      .optional()
      .describe("Max allowed zone; higher zones flag a violation."),
  },
  async ({ text, required_zone }) => {
    const result = compliance(text, required_zone as Zone | undefined);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "shield_catalog",
  "List the supported PII patterns and current environment configuration " +
    "(without exposing any secrets).",
  {},
  async () => {
    const catalog = patterns.map((p) => ({
      name: p.name,
      label: p.label,
      severity: p.severity,
      source: p.regex.source,
    }));
    const config = {
      MCP_SHIELD_NAMES: process.env.MCP_SHIELD_NAMES === "1" ? "enabled" : "disabled",
      MCP_SHIELD_ACCOUNT_PATTERN:
        process.env.MCP_SHIELD_ACCOUNT_PATTERN ?? "(default digit pattern)",
    };
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ patterns: catalog, config }, null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(`mcp-privacy-shield failed: ${err}`);
  process.exit(1);
});
