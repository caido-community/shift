import { z } from "zod";

import { SkillScopeSchema } from "./skills";

export const AgentModeSchema = z.enum(["focus", "wildcard"]);
export type AgentMode = z.infer<typeof AgentModeSchema>;

const CustomAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  skillIds: z.array(z.string()),
  allowedWorkflowIds: z.array(z.string()).optional(),
  instructions: z.string(),
  scope: SkillScopeSchema,
  projectId: z.string().min(1).optional(),
  boundCollections: z.array(z.string()),
});
export type CustomAgent = z.infer<typeof CustomAgentSchema>;

const ResolvedCustomAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  skills: z.array(z.object({ id: z.string(), title: z.string(), content: z.string() })),
  allowedWorkflowIds: z.array(z.string()).optional(),
  instructions: z.string(),
});
export type ResolvedCustomAgent = z.infer<typeof ResolvedCustomAgentSchema>;

export const CreateCustomAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  skillIds: z.array(z.string()).default([]),
  allowedWorkflowIds: z.array(z.string()).optional(),
  instructions: z.string().default(""),
  scope: SkillScopeSchema,
  boundCollections: z.array(z.string()).default([]),
});
export type CreateCustomAgentInput = z.infer<typeof CreateCustomAgentSchema>;

export const UpdateCustomAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
  allowedWorkflowIds: z.array(z.string()).optional().nullable(),
  instructions: z.string().optional(),
  scope: SkillScopeSchema.optional(),
  boundCollections: z.array(z.string()).optional(),
});
export type UpdateCustomAgentInput = z.infer<typeof UpdateCustomAgentSchema>;
