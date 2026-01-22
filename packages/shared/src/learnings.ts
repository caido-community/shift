import { z } from "zod";

const LearningsConfigSchema = z.object({
  entries: z.array(z.string()),
});
export type LearningsConfig = z.infer<typeof LearningsConfigSchema>;

export const defaultLearningsConfig: LearningsConfig = {
  entries: [],
};

export const AddLearningSchema = z.object({
  content: z.string().min(1),
});
export type AddLearningInput = z.infer<typeof AddLearningSchema>;

export const UpdateLearningSchema = z.object({
  index: z.number().min(0),
  content: z.string().min(1),
});
export type UpdateLearningInput = z.infer<typeof UpdateLearningSchema>;

export const RemoveLearningsSchema = z.object({
  indexes: z.array(z.number().min(0)),
});
export type RemoveLearningsInput = z.infer<typeof RemoveLearningsSchema>;
