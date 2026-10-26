import type { AgentSkill } from "shared";

export const FINDINGS_SKILL: AgentSkill = {
  id: "builtin:findings",
  title: "Finding reports",
  description: "Read when documenting a confirmed vulnerability or assigning its severity.",
  attachMode: "on-demand",
  content: `
Document demonstrated security impact, not just unusual behavior. Distinguish observations from inferences and unverified prerequisites. A reflection, WAF block, error message, or single slow response alone does not establish exploitability.

Include the affected endpoint and parameter, required access or user interaction, reproduction steps, the key request and response evidence, and the demonstrated impact. Keep excerpts short and copy evidence exactly.

FindingsCreate links a finding to the current replay entry. Navigate to the entry containing the evidence before creating the finding, and keep replay state unchanged until it finishes.

Rate severity from demonstrated impact, affected users, required privileges, and attack complexity. Vulnerability names alone do not determine severity. Use the engagement's severity criteria when supplied; do not invent a CVSS score without assessing its metrics.

Typical impact ranges, subject to those conditions:
- CRITICAL: full system compromise, broad database access, or mass exposure of highly sensitive data.
- HIGH: substantial sensitive data access, privilege escalation, or account takeover.
- MEDIUM: limited sensitive data exposure or a constrained exploit with meaningful business impact.
- LOW: minor information disclosure or limited-impact misconfiguration.

There is no browser in this agent. For client-side issues, explain which browser behavior remains unverified and avoid claiming script execution from HTTP reflection alone.
`.trim(),
};
