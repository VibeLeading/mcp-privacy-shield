import { sanitize } from "./redactor.js";

export type Zone = "public" | "internal" | "restricted" | "vault";

export interface Classification {
  zone: Zone;
  confidence: number;
  reasons: string[];
}

const zoneRank: Record<Zone, number> = {
  public: 0,
  internal: 1,
  restricted: 2,
  vault: 3,
};

const internalKeywords = [
  "confidential",
  "internal",
  "proprietary",
  "roadmap",
  "nda",
  "employee handbook",
  "incident report",
  "draft",
];

export function classify(text: string): Classification {
  const { triggered, risk, redacted } = sanitize(text);
  const reasons: string[] = [];

  const isCritical = triggered.some((t) =>
    ["credit_card", "ssn", "bank_account", "passport"].includes(t),
  );

  const longNumberSequences = /(?:\d[\s-]?){12,}/.test(text);

  if (isCritical || longNumberSequences || risk === "high") {
    reasons.push("vault-level sensitive data detected (financial, identity, or long number sequences)");
    return { zone: "vault", confidence: 0.95, reasons };
  }

  if (triggered.length > 0 || risk === "medium") {
    reasons.push(
      "medium-sensitivity PII detected (email, phone, personal name, or similar)",
    );
    return { zone: "restricted", confidence: 0.85, reasons };
  }

  const lower = text.toLowerCase();
  const hits = internalKeywords.filter((k) => lower.includes(k));
  if (hits.length > 0) {
    reasons.push(`internal keyword(s) present: ${hits.join(", ")}`);
    return { zone: "internal", confidence: 0.9, reasons };
  }

  reasons.push("no sensitive patterns or internal markers detected");
  return { zone: "public", confidence: 0.8, reasons };
}

export interface ComplianceResult {
  compliance_score: number;
  violations: string[];
  passed: boolean;
}

const categoryDeductions: Record<string, number> = {
  email: 10,
  phone: 10,
  ipv4: 5,
  url: 5,
  person_name: 15,
  passport: 30,
  bank_account: 40,
  ssn: 40,
  credit_card: 40,
};

export function compliance(
  text: string,
  require?: Zone,
): ComplianceResult {
  const { triggered, redacted, risk } = sanitize(text);
  const violations: string[] = [];
  let score = 100;

  const present = new Set(triggered);
  for (const [cat, deduction] of Object.entries(categoryDeductions)) {
    if (present.has(cat)) {
      score -= deduction;
      violations.push(`sensitive category detected: ${cat}`);
    }
  }

  if (risk === "high") {
    score = Math.min(score, 40);
    violations.push("high-risk PII volume or vault-level data present");
  } else if (risk === "medium") {
    score = Math.min(score, 70);
  }

  if (require) {
    const { zone, confidence } = classify(text);
    if (zoneRank[zone] > zoneRank[require]) {
      score -= 25;
      violations.push(
        `zone "${zone}" ranks higher than required "${require}" (confidence ${confidence.toFixed(2)})`,
      );
    }
  }

  if (redacted !== text && violations.length === 0) {
    violations.push("PII present but not yet redacted");
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= 60 && violations.length === 0;

  return { compliance_score: score, violations, passed };
}
