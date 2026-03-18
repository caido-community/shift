import { describe, expect, it } from "vitest";

import {
  extractLegacyCollectionAutoRunMigration,
  summarizeLegacyCollectionAutoRunMigration,
} from "./legacy-migration";

describe("legacy collection auto-run migration", () => {
  it("cleans a legacy static skill binding and returns one affected entry", () => {
    const loaded = {
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Legacy Skill",
          content: "content",
          scope: "global",
          autoExecuteCollection: "Collection A",
        },
      ],
      projectOverrides: [],
    };

    const result = extractLegacyCollectionAutoRunMigration(loaded);

    expect(result.mutated).toBe(true);
    expect(result.entries).toEqual([
      {
        skillId: "skill-1",
        title: "Legacy Skill",
        collectionName: "Collection A",
        scope: "global",
      },
    ]);
    expect(result.cleaned).toEqual({
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Legacy Skill",
          content: "content",
          scope: "global",
        },
      ],
      projectOverrides: [],
    });
  });

  it("cleans mixed legacy skills while preserving all non-legacy data", () => {
    const loaded = {
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Global Skill",
          content: "content-1",
          scope: "global",
          autoExecuteCollection: "Collection A",
        },
        {
          type: "dynamic",
          id: "skill-2",
          title: "Project Skill",
          url: "https://example.com/skill.md",
          scope: "project",
          projectId: "project-1",
          autoExecuteCollection: "Collection B",
        },
        {
          type: "static",
          id: "skill-3",
          title: "Already Current",
          content: "content-3",
          scope: "global",
        },
      ],
      projectOverrides: [{ skillId: "skill-1", projectId: "project-1", additionalContent: "x" }],
    };

    const result = extractLegacyCollectionAutoRunMigration(loaded);

    expect(result.mutated).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.cleaned).toEqual({
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Global Skill",
          content: "content-1",
          scope: "global",
        },
        {
          type: "dynamic",
          id: "skill-2",
          title: "Project Skill",
          url: "https://example.com/skill.md",
          scope: "project",
          projectId: "project-1",
        },
        {
          type: "static",
          id: "skill-3",
          title: "Already Current",
          content: "content-3",
          scope: "global",
        },
      ],
      projectOverrides: [{ skillId: "skill-1", projectId: "project-1", additionalContent: "x" }],
    });
  });

  it("leaves old release style data unchanged", () => {
    const loaded = {
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Current Skill",
          content: "content",
          scope: "global",
        },
      ],
      projectOverrides: [],
    };

    const result = extractLegacyCollectionAutoRunMigration(loaded);

    expect(result.mutated).toBe(false);
    expect(result.entries).toEqual([]);
    expect(result.cleaned).toBe(loaded);
  });

  it("strips malformed legacy auto-run data without creating a summary entry", () => {
    const loaded = {
      skills: [
        {
          type: "static",
          id: "",
          title: "Broken Skill",
          content: "content",
          scope: "global",
          autoExecuteCollection: "Collection A",
        },
      ],
      projectOverrides: [],
    };

    const result = extractLegacyCollectionAutoRunMigration(loaded);

    expect(result.mutated).toBe(true);
    expect(result.entries).toEqual([]);
    expect(result.cleaned).toEqual({
      skills: [
        {
          type: "static",
          id: "",
          title: "Broken Skill",
          content: "content",
          scope: "global",
        },
      ],
      projectOverrides: [],
    });
  });

  it("is idempotent after cleanup", () => {
    const loaded = {
      skills: [
        {
          type: "static",
          id: "skill-1",
          title: "Legacy Skill",
          content: "content",
          scope: "global",
          autoExecuteCollection: "Collection A",
        },
      ],
      projectOverrides: [],
    };

    const firstPass = extractLegacyCollectionAutoRunMigration(loaded);
    const secondPass = extractLegacyCollectionAutoRunMigration(firstPass.cleaned);

    expect(firstPass.mutated).toBe(true);
    expect(secondPass.mutated).toBe(false);
    expect(secondPass.entries).toEqual([]);
  });

  it("hides other-project legacy entries from the current project summary", () => {
    const summary = summarizeLegacyCollectionAutoRunMigration(
      [
        {
          skillId: "skill-1",
          title: "Global Skill",
          collectionName: "Collection A",
          scope: "global",
        },
        {
          skillId: "skill-2",
          title: "Current Project Skill",
          collectionName: "Collection B",
          scope: "project",
          projectId: "project-1",
        },
        {
          skillId: "skill-3",
          title: "Other Project Skill",
          collectionName: "Collection C",
          scope: "project",
          projectId: "project-2",
        },
      ],
      "project-1"
    );

    expect(summary).toEqual({
      affected: true,
      entries: [
        {
          skillId: "skill-1",
          title: "Global Skill",
          collectionName: "Collection A",
          scope: "global",
        },
        {
          skillId: "skill-2",
          title: "Current Project Skill",
          collectionName: "Collection B",
          scope: "project",
          projectId: "project-1",
        },
      ],
      hiddenProjectScopedCount: 1,
    });
  });
});
