import type {
  AddModelInput,
  ModelsConfig,
  ModelUsageType,
  RemoveModelInput,
  UpdateModelConfigInput,
  UpdateModelEnabledForInput,
} from "shared";

export type ModelsModel = {
  config: ModelsConfig | undefined;
  isLoading: boolean;
  error: string | undefined;
};

export const initialModel: ModelsModel = {
  config: undefined,
  isLoading: false,
  error: undefined,
};

export type ModelsMessage =
  | { type: "FETCH_REQUEST" }
  | { type: "FETCH_SUCCESS"; config: ModelsConfig }
  | { type: "FETCH_FAILURE"; error: string }
  | { type: "ADD_MODEL_REQUEST"; input: AddModelInput }
  | { type: "ADD_MODEL_SUCCESS"; input: AddModelInput }
  | { type: "ADD_MODEL_FAILURE"; error: string }
  | { type: "REMOVE_MODEL_REQUEST"; input: RemoveModelInput }
  | { type: "REMOVE_MODEL_SUCCESS"; input: RemoveModelInput }
  | { type: "REMOVE_MODEL_FAILURE"; error: string }
  | { type: "UPDATE_CONFIG_REQUEST"; key: string; input: UpdateModelConfigInput }
  | { type: "UPDATE_CONFIG_SUCCESS"; key: string; input: UpdateModelConfigInput }
  | { type: "UPDATE_CONFIG_FAILURE"; error: string }
  | {
      type: "UPDATE_ENABLED_FOR_REQUEST";
      key: string;
      input: UpdateModelEnabledForInput;
    }
  | {
      type: "UPDATE_ENABLED_FOR_SUCCESS";
      key: string;
      enabledFor: ModelUsageType[];
    }
  | { type: "UPDATE_ENABLED_FOR_FAILURE"; error: string };
