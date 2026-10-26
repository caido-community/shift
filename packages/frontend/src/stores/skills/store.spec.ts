import { createPinia, setActivePinia } from "pinia";
import { Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSkillsStore } from "./store";

const backend = vi.hoisted(() => ({
  removeSkill: vi.fn(),
  getCustomAgentDefinitions: vi.fn(),
  getResolvedCustomAgents: vi.fn(),
}));

vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ backend }) }));

describe("skills store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    backend.getCustomAgentDefinitions.mockResolvedValue(Result.ok([]));
    backend.getResolvedCustomAgents.mockResolvedValue(Result.ok([]));
  });

  it("refetches custom agents after a skill change so their skill copies stay current", async () => {
    backend.removeSkill.mockResolvedValue(Result.ok({ definitions: [], skills: [] }));

    await expect(useSkillsStore().remove("skill-1")).resolves.toEqual(Result.ok(undefined));

    expect(backend.getResolvedCustomAgents).toHaveBeenCalledOnce();
  });

  it("leaves custom agents alone when the skill change fails", async () => {
    backend.removeSkill.mockResolvedValue(Result.err("Skill not found"));

    await expect(useSkillsStore().remove("skill-1")).resolves.toEqual(
      Result.err("Skill not found")
    );

    expect(backend.getResolvedCustomAgents).not.toHaveBeenCalled();
  });
});
