import { type Model, ModelProvider, type ModelUsageType } from "shared";

const GoogleModelIds = {
  GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS: "gemini-3.1-pro-preview-customtools",
  GEMINI_3_1_FLASH_LITE_PREVIEW: "gemini-3.1-flash-lite-preview",
  GEMINI_3_FLASH_PREVIEW: "gemini-3-flash-preview",
} as const;

export const googleModels: Model[] = [
  {
    id: GoogleModelIds.GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS,
    name: "Gemini 3.1 Pro",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: GoogleModelIds.GEMINI_3_1_FLASH_LITE_PREVIEW,
    name: "Gemini 3.1 Flash-Lite",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: GoogleModelIds.GEMINI_3_FLASH_PREVIEW,
    name: "Gemini 3 Flash",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultGoogleModelsConfig: Record<string, ModelUsageType[]> = {
  [GoogleModelIds.GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS]: ["agent", "float"],
  [GoogleModelIds.GEMINI_3_1_FLASH_LITE_PREVIEW]: ["agent", "float"],
  [GoogleModelIds.GEMINI_3_FLASH_PREVIEW]: ["agent", "float"],
};
