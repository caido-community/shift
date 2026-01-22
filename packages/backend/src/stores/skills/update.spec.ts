import { describe, expect, it } from "vitest";

import { DEFAULT_SKILLS } from "../../skills/defaults";

import { createInitialModel, type SkillsModel } from "./model";
import { update } from "./update";

const createModelWithStaticSkill = (): SkillsModel => ({
  skills: [
    {
      type: "static",
      id: "skill-1",
      title: "Test Skill",
      content: "Test content",
      scope: "project",
    },
  ],
});

const createModelWithDynamicSkill = (): SkillsModel => ({
  skills: [
    {
      type: "dynamic",
      id: "skill-2",
      title: "Dynamic Skill",
      url: "https://example.com/skill.md",
      scope: "project",
    },
  ],
});

describe("skills update", () => {
  describe("ADD_STATIC_SKILL", () => {
    it("adds a static skill", () => {
      const model = createInitialModel();

      const result = update(model, {
        type: "ADD_STATIC_SKILL",
        definition: {
          type: "static",
          id: "skill-1",
          title: "New Skill",
          content: "Skill content",
          scope: "project",
        },
      });

      expect(result.skills).toHaveLength(DEFAULT_SKILLS.length + 1);
      expect(result.skills[DEFAULT_SKILLS.length]?.id).toBe("skill-1");
      expect(result.skills[DEFAULT_SKILLS.length]?.type).toBe("static");
    });
  });

  describe("ADD_DYNAMIC_SKILL", () => {
    it("adds a dynamic skill", () => {
      const model = createInitialModel();

      const result = update(model, {
        type: "ADD_DYNAMIC_SKILL",
        definition: {
          type: "dynamic",
          id: "skill-2",
          title: "Remote Skill",
          url: "https://example.com/skill.md",
          scope: "global",
        },
      });

      expect(result.skills).toHaveLength(DEFAULT_SKILLS.length + 1);
      expect(result.skills[DEFAULT_SKILLS.length]?.id).toBe("skill-2");
      expect(result.skills[DEFAULT_SKILLS.length]?.type).toBe("dynamic");
    });
  });

  describe("UPDATE_STATIC_SKILL", () => {
    it("updates title of static skill", () => {
      const model = createModelWithStaticSkill();

      const result = update(model, {
        type: "UPDATE_STATIC_SKILL",
        id: "skill-1",
        updates: { title: "Updated Title" },
        projectId: undefined,
      });

      const skill = result.skills[0];
      expect(skill?.type).toBe("static");
      if (skill?.type === "static") {
        expect(skill.title).toBe("Updated Title");
        expect(skill.content).toBe("Test content");
      }
    });

    it("updates content of static skill", () => {
      const model = createModelWithStaticSkill();

      const result = update(model, {
        type: "UPDATE_STATIC_SKILL",
        id: "skill-1",
        updates: { content: "Updated content" },
        projectId: undefined,
      });

      const skill = result.skills[0];
      expect(skill?.type).toBe("static");
      if (skill?.type === "static") {
        expect(skill.content).toBe("Updated content");
      }
    });

    it("returns unchanged model when skill not found", () => {
      const model = createModelWithStaticSkill();

      const result = update(model, {
        type: "UPDATE_STATIC_SKILL",
        id: "nonexistent",
        updates: { title: "Updated" },
        projectId: undefined,
      });

      expect(result).toBe(model);
    });

    it("returns unchanged model when skill is not static", () => {
      const model = createModelWithDynamicSkill();

      const result = update(model, {
        type: "UPDATE_STATIC_SKILL",
        id: "skill-2",
        updates: { title: "Updated" },
        projectId: undefined,
      });

      expect(result).toBe(model);
    });
  });

  describe("UPDATE_DYNAMIC_SKILL", () => {
    it("updates title of dynamic skill", () => {
      const model = createModelWithDynamicSkill();

      const result = update(model, {
        type: "UPDATE_DYNAMIC_SKILL",
        id: "skill-2",
        updates: { title: "Updated Title" },
        projectId: undefined,
      });

      const skill = result.skills[0];
      expect(skill?.type).toBe("dynamic");
      if (skill?.type === "dynamic") {
        expect(skill.title).toBe("Updated Title");
        expect(skill.url).toBe("https://example.com/skill.md");
      }
    });

    it("updates url of dynamic skill", () => {
      const model = createModelWithDynamicSkill();

      const result = update(model, {
        type: "UPDATE_DYNAMIC_SKILL",
        id: "skill-2",
        updates: { url: "https://new-url.com/skill.md" },
        projectId: undefined,
      });

      const skill = result.skills[0];
      expect(skill?.type).toBe("dynamic");
      if (skill?.type === "dynamic") {
        expect(skill.url).toBe("https://new-url.com/skill.md");
      }
    });

    it("returns unchanged model when skill not found", () => {
      const model = createModelWithDynamicSkill();

      const result = update(model, {
        type: "UPDATE_DYNAMIC_SKILL",
        id: "nonexistent",
        updates: { title: "Updated" },
        projectId: undefined,
      });

      expect(result).toBe(model);
    });
  });

  describe("REMOVE_SKILL", () => {
    it("removes a skill by id", () => {
      const model = createModelWithStaticSkill();

      const result = update(model, {
        type: "REMOVE_SKILL",
        id: "skill-1",
      });

      expect(result.skills).toHaveLength(0);
    });

    it("preserves other skills when removing one", () => {
      const model: SkillsModel = {
        skills: [
          {
            type: "static",
            id: "skill-1",
            title: "Skill 1",
            content: "Content 1",
            scope: "project",
          },
          {
            type: "static",
            id: "skill-2",
            title: "Skill 2",
            content: "Content 2",
            scope: "global",
          },
        ],
      };

      const result = update(model, {
        type: "REMOVE_SKILL",
        id: "skill-1",
      });

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0]?.id).toBe("skill-2");
    });
  });

  describe("unknown message type", () => {
    it("returns the model unchanged", () => {
      const model = createInitialModel();

      const result = update(model, { type: "UNKNOWN" } as never);

      expect(result).toBe(model);
    });
  });

  describe("createInitialModel", () => {
    it("creates model with default skills", () => {
      const model = createInitialModel();

      expect(model.skills).toEqual(DEFAULT_SKILLS);
    });
  });
});
