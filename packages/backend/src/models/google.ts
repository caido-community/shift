import { type Model, ModelProvider, type ModelUsageType } from "shared";

const GoogleModelIds = {
  GEMINI_3_PRO_PREVIEW: "gemini-3-pro-preview",
  GEMINI_3_FLASH_PREVIEW: "gemini-3-flash-preview",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE: "gemini-2.5-flash-lite",
} as const;

export const googleModels: Model[] = [
  {
    id: GoogleModelIds.GEMINI_3_PRO_PREVIEW,
    name: "Gemini 3 Pro",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: true,
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
  {
    id: GoogleModelIds.GEMINI_2_5_PRO,
    name: "Gemini 2.5 Pro",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: GoogleModelIds.GEMINI_2_5_FLASH,
    name: "Gemini 2.5 Flash",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: GoogleModelIds.GEMINI_2_5_FLASH_LITE,
    name: "Gemini 2.5 Flash-Lite",
    provider: ModelProvider.Google,
    capabilities: {
      reasoning: false,
    },
  },
];

export const defaultGoogleModelsConfig: Record<string, ModelUsageType[]> = {
  [GoogleModelIds.GEMINI_3_PRO_PREVIEW]: ["agent", "float"],
  [GoogleModelIds.GEMINI_3_FLASH_PREVIEW]: ["agent", "float"],
  [GoogleModelIds.GEMINI_2_5_PRO]: ["agent", "float"],
  [GoogleModelIds.GEMINI_2_5_FLASH]: ["agent", "float"],
  [GoogleModelIds.GEMINI_2_5_FLASH_LITE]: ["agent", "float"],
};
