import { z } from "zod";

export const LegacyCollectionAutoRunSkillSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  scope: z.enum(["global", "project"]),
  projectId: z.string().min(1).optional(),
  autoExecuteCollection: z.string().min(1),
});

export const LegacyCollectionAutoRunMigrationEntrySchema = z.object({
  skillId: z.string().min(1),
  title: z.string().min(1),
  collectionName: z.string().min(1),
  scope: z.enum(["global", "project"]),
  projectId: z.string().min(1).optional(),
});
export type LegacyCollectionAutoRunMigrationEntry = z.infer<
  typeof LegacyCollectionAutoRunMigrationEntrySchema
>;

export const LegacyCollectionAutoRunMigrationSummarySchema = z.object({
  affected: z.boolean(),
  entries: z.array(LegacyCollectionAutoRunMigrationEntrySchema),
  hiddenProjectScopedCount: z.number().int().nonnegative(),
});
export type LegacyCollectionAutoRunMigrationSummary = z.infer<
  typeof LegacyCollectionAutoRunMigrationSummarySchema
>;
