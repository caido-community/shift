import type { AgentSkill, ResolvedCustomAgent } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentContext } from "./context";
import { BUILT_IN_SKILLS } from "./skills";
import { ReadSkill } from "./tools/skills/ReadSkill";

const stores = vi.hoisted(() => ({
  skills: [] as AgentSkill[],
  agent: undefined as ResolvedCustomAgent | undefined,
}));

vi.mock("@/stores/skills", () => ({
  useSkillsStore: () => ({ skills: stores.skills }),
}));

vi.mock("@/stores/custom-agents/store", () => ({
  useCustomAgentsStore: () => ({ getAgentById: () => stores.agent }),
}));

const selectedSkill: AgentSkill = {
  id: "user:selected",
  title: "Selected skill",
  description: "Guidance for a selected task",
  content: "Selected user instructions",
  attachMode: "on-demand",
};

const otherSkill: AgentSkill = {
  id: "user:other",
  title: "Other skill",
  content: "Other user instructions",
  attachMode: "always",
};

function createContext(selectedSkillIds: string[] = [], selectedCustomAgentId?: string) {
  return new AgentContext({} as never, "session-1", {
    selectedSkillIds,
    selectedCustomAgentId,
    mode: "focus",
  } as never);
}

async function readSkill(context: AgentContext, skillId: string) {
  return ReadSkill.execute?.(
    { skillId },
    { experimental_context: context, toolCallId: "read-skill", messages: [] }
  );
}

describe("agent skill discovery and loading", () => {
  beforeEach(() => {
    stores.skills = [selectedSkill, otherSkill];
    stores.agent = undefined;
  });

  it("advertises built-ins without their bodies and loads them through ReadSkill", async () => {
    const context = createContext();
    const prompt = context.toSkillsPrompt();

    for (const skill of BUILT_IN_SKILLS) {
      expect(prompt).toContain(skill.id);
      expect(prompt).not.toContain(skill.content);
      await expect(readSkill(context, skill.id)).resolves.toMatchObject({
        kind: "Ok",
        value: { skillId: skill.id, content: skill.content, hasMore: false },
      });
    }

    expect(context.selectedSkills).toEqual(stores.skills);
    expect(prompt).toContain(otherSkill.content);
    expect(prompt).not.toContain(selectedSkill.content);
  });

  it("keeps built-ins available when user skills are filtered and rejects unselected skills", async () => {
    const context = createContext([selectedSkill.id]);

    expect(context.availableSkills).toEqual([...BUILT_IN_SKILLS, selectedSkill]);
    expect(context.toSkillsPrompt()).not.toContain(otherSkill.id);
    await expect(readSkill(context, selectedSkill.id)).resolves.toMatchObject({ kind: "Ok" });
    await expect(readSkill(context, otherSkill.id)).resolves.toMatchObject({ kind: "Error" });
  });

  it("respects custom agent selection without hiding built-ins", async () => {
    stores.agent = {
      id: "custom-agent",
      name: "Custom agent",
      description: "",
      instructions: "Custom testing instructions",
      skills: [selectedSkill],
    };
    const context = createContext([], stores.agent.id);

    expect(context.availableSkills).toEqual([...BUILT_IN_SKILLS, selectedSkill]);
    expect(context.toSkillsPrompt()).toContain(stores.agent.instructions);
    await expect(readSkill(context, otherSkill.id)).resolves.toMatchObject({ kind: "Error" });

    stores.agent.skills = [];
    expect(context.availableSkills).toEqual(BUILT_IN_SKILLS);
    await expect(readSkill(context, selectedSkill.id)).resolves.toMatchObject({ kind: "Error" });
  });

  it("provides built-ins when no user skills exist", () => {
    stores.skills = [];

    expect(createContext().availableSkills).toEqual(BUILT_IN_SKILLS);
  });

  it("keeps built-in IDs authoritative in both discovery and retrieval", async () => {
    const builtIn = BUILT_IN_SKILLS[0]!;
    const collision = { ...selectedSkill, id: builtIn.id, attachMode: "always" as const };
    stores.skills = [collision, otherSkill];
    const context = createContext();

    expect(context.availableSkills).toEqual([...BUILT_IN_SKILLS, otherSkill]);
    expect(context.toSkillsPrompt()).not.toContain(collision.content);
    await expect(readSkill(context, builtIn.id)).resolves.toMatchObject({
      kind: "Ok",
      value: { content: builtIn.content },
    });
    expect(stores.skills).toEqual([collision, otherSkill]);
  });
});
