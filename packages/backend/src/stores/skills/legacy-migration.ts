import type {
  LegacyCollectionAutoRunMigrationEntry,
  LegacyCollectionAutoRunMigrationSummary,
} from "shared";
import { LegacyCollectionAutoRunSkillSchema } from "shared";

import { isRecord } from "../../utils";

type LegacyMigrationExtractionResult = {
  cleaned: unknown;
  entries: LegacyCollectionAutoRunMigrationEntry[];
  mutated: boolean;
};

function extractEntry(
  skill: Record<string, unknown>
): LegacyCollectionAutoRunMigrationEntry | undefined {
  const parsed = LegacyCollectionAutoRunSkillSchema.safeParse(skill);
  if (!parsed.success) {
    return undefined;
  }

  return {
    skillId: parsed.data.id,
    title: parsed.data.title,
    collectionName: parsed.data.autoExecuteCollection,
    scope: parsed.data.scope,
    projectId: parsed.data.projectId,
  };
}

export function extractLegacyCollectionAutoRunMigration(
  loaded: unknown
): LegacyMigrationExtractionResult {
  if (!isRecord(loaded) || !Array.isArray(loaded.skills)) {
    return {
      cleaned: loaded,
      entries: [],
      mutated: false,
    };
  }

  const entries: LegacyCollectionAutoRunMigrationEntry[] = [];
  let mutated = false;

  const cleanedSkills = loaded.skills.map((skill) => {
    if (!isRecord(skill)) {
      return skill;
    }

    const entry = extractEntry(skill);
    if (entry !== undefined) {
      entries.push(entry);
    }

    if (!("autoExecuteCollection" in skill)) {
      return skill;
    }

    mutated = true;
    const { autoExecuteCollection: _autoExecuteCollection, ...rest } = skill;
    return rest;
  });

  if (!mutated) {
    return {
      cleaned: loaded,
      entries,
      mutated: false,
    };
  }

  return {
    cleaned: {
      ...loaded,
      skills: cleanedSkills,
    },
    entries,
    mutated: true,
  };
}

export function summarizeLegacyCollectionAutoRunMigration(
  entries: LegacyCollectionAutoRunMigrationEntry[],
  currentProjectId: string | undefined
): LegacyCollectionAutoRunMigrationSummary {
  const visibleEntries: LegacyCollectionAutoRunMigrationEntry[] = [];
  let hiddenProjectScopedCount = 0;

  for (const entry of entries) {
    if (entry.scope === "project" && entry.projectId !== currentProjectId) {
      hiddenProjectScopedCount += 1;
      continue;
    }

    visibleEntries.push(entry);
  }

  return {
    affected: entries.length > 0,
    entries: visibleEntries,
    hiddenProjectScopedCount,
  };
}
