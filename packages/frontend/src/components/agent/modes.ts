import type { AgentMode } from "shared";

export const AGENT_MODES: Array<{
  value: AgentMode;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: "focus",
    label: "Focus",
    icon: "fas fa-crosshairs",
    description: "Stays focused on the current endpoint.",
  },
  {
    value: "wildcard",
    label: "Wildcard",
    icon: "fas fa-globe",
    description: "Explores freely. Can test other endpoints and browse HTTP history.",
  },
];
