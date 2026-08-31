export interface Pattern {
  name: string;
  label: string;
  regex: RegExp;
  severity: "low" | "medium" | "high" | "critical";
}

export const accountPattern =
  process.env.MCP_SHIELD_ACCOUNT_PATTERN ?? "\\b\\d{8,17}\\b";

export const patterns: Pattern[] = [
  {
    name: "email",
    label: "EMAIL",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: "medium",
  },
  {
    name: "phone",
    label: "PHONE",
    regex:
      /\b(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g,
    severity: "medium",
  },
  {
    name: "credit_card",
    label: "CREDIT_CARD",
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    severity: "critical",
  },
  {
    name: "ssn",
    label: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: "critical",
  },
  {
    name: "bank_account",
    label: "ACCOUNT",
    regex: new RegExp(accountPattern, "g"),
    severity: "critical",
  },
  {
    name: "ipv4",
    label: "IP",
    regex:
      /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
    severity: "low",
  },
  {
    name: "url",
    label: "URL",
    regex: /\bhttps?:\/\/[^\s<>"'\]]+/g,
    severity: "low",
  },
  {
    name: "passport",
    label: "PASSPORT_ID",
    regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
    severity: "high",
  },
];

const nameEnabled = () => process.env.MCP_SHIELD_NAMES === "1";

function findNames(text: string): Map<number, string> {
  const found = new Map<number, string>();
  if (!nameEnabled()) return found;
  const re = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found.set(m.index, `${m[1]} ${m[2]}`);
  }
  return found;
}

export interface SanitizeResult {
  redacted: string;
  replacements: Record<string, string>;
  triggered: string[];
  risk: "low" | "medium" | "high";
}

const severityWeight: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function sanitize(text: string, options: { mask?: boolean } = {}): SanitizeResult {
  const mask = options.mask ?? false;
  const counts = new Map<string, number>();
  const replacements: Record<string, string> = {};
  const triggered: string[] = [];
  let hitCount = 0;
  let maxWeight = 0;

  const positions = new Map<number, { start: number; end: number; label: string }>();

  for (const p of patterns) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.regex.exec(text)) !== null) {
      const idx = m.index;
      const len = m[0].length;
      const prev = positions.get(idx);
      if (prev && prev.end >= idx + len) continue;
      const n = (counts.get(p.label) ?? 0) + 1;
      counts.set(p.label, n);
      positions.set(idx, { start: idx, end: idx + len, label: p.label });
      triggered.push(p.name);
      hitCount++;
      maxWeight = Math.max(maxWeight, severityWeight[p.severity]);
    }
  }

  if (nameEnabled()) {
    for (const [idx, name] of findNames(text)) {
      const n = (counts.get("PERSON") ?? 0) + 1;
      counts.set("PERSON", n);
      positions.set(idx, { start: idx, end: idx + name.length, label: "PERSON" });
      triggered.push("person_name");
      hitCount++;
      maxWeight = Math.max(maxWeight, 3);
    }
  }

  const sorted = Array.from(positions.values()).sort((a, b) => a.start - b.start);
  let redacted = "";
  let cursor = 0;
  for (const hit of sorted) {
    redacted += text.slice(cursor, hit.start);
    const tokenKey = mask
      ? `[${hit.label}]`
      : `[${hit.label}_${String(counts.get(hit.label)).padStart(2, "0")}]`;
    replacements[text.slice(hit.start, hit.end)] = tokenKey;
    redacted += tokenKey;
    cursor = hit.end;
  }
  redacted += text.slice(cursor);

  let risk: "low" | "medium" | "high";
  if (hitCount === 0) risk = "low";
  else if (maxWeight >= 4 || hitCount >= 5) risk = "high";
  else if (maxWeight >= 3 || hitCount >= 3) risk = "medium";
  else risk = "low";

  const uniqueTriggered = Array.from(new Set(triggered));
  return { redacted, replacements, triggered: uniqueTriggered, risk };
}
