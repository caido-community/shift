import { z } from "zod";

const SkillScopeSchema = z.enum(["global", "project"]);
export type SkillScope = z.infer<typeof SkillScopeSchema>;

const StaticSkillDefinitionSchema = z.object({
  type: z.literal("static"),
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  scope: SkillScopeSchema,
  projectId: z.string().min(1).optional(),
  autoExecuteCollection: z.string().optional(),
});
export type StaticSkillDefinition = z.infer<typeof StaticSkillDefinitionSchema>;

const DynamicSkillDefinitionSchema = z.object({
  type: z.literal("dynamic"),
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  scope: SkillScopeSchema,
  projectId: z.string().min(1).optional(),
  autoExecuteCollection: z.string().optional(),
});
export type DynamicSkillDefinition = z.infer<typeof DynamicSkillDefinitionSchema>;

const AgentSkillDefinitionSchema = z.discriminatedUnion("type", [
  StaticSkillDefinitionSchema,
  DynamicSkillDefinitionSchema,
]);
export type AgentSkillDefinition = z.infer<typeof AgentSkillDefinitionSchema>;

const AgentSkillSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

export const CreateStaticSkillSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  scope: SkillScopeSchema,
});
export type CreateStaticSkillInput = z.infer<typeof CreateStaticSkillSchema>;

export const CreateDynamicSkillSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  scope: SkillScopeSchema,
});
export type CreateDynamicSkillInput = z.infer<typeof CreateDynamicSkillSchema>;

export const UpdateStaticSkillSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  scope: SkillScopeSchema.optional(),
  autoExecuteCollection: z.string().optional().nullable(),
});
export type UpdateStaticSkillInput = z.infer<typeof UpdateStaticSkillSchema>;

export const UpdateDynamicSkillSchema = z.object({
  title: z.string().min(1).optional(),
  url: z.url().optional(),
  scope: SkillScopeSchema.optional(),
  autoExecuteCollection: z.string().optional().nullable(),
});
export type UpdateDynamicSkillInput = z.infer<typeof UpdateDynamicSkillSchema>;

const ProjectSkillOverrideSchema = z.object({
  skillId: z.string().min(1),
  projectId: z.string().min(1),
  additionalContent: z.string(),
});
export type ProjectSkillOverride = z.infer<typeof ProjectSkillOverrideSchema>;

export const SetProjectOverrideSchema = z.object({
  skillId: z.string().min(1),
  additionalContent: z.string(),
});
export type SetProjectOverrideInput = z.infer<typeof SetProjectOverrideSchema>;
