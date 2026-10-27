import type { AgentSkill } from "shared";

import { FINDINGS_SKILL } from "./findings";

import { HTTPQL_REFERENCE } from "@/prompts/httpql";

export const BUILT_IN_SKILLS: readonly AgentSkill[] = [
  {
    id: "builtin:httpql",
    title: "HTTPQL",
    description: "Read before writing or correcting an HTTPQL filter for HistorySearch.",
    attachMode: "on-demand",
    content: HTTPQL_REFERENCE.trim(),
  },
  FINDINGS_SKILL,
];
