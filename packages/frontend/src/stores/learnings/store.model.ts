import type {
  AddLearningInput,
  LearningsConfig,
  RemoveLearningsInput,
  UpdateLearningInput,
} from "shared";

export type LearningsModel = {
  config: LearningsConfig | undefined;
  isLoading: boolean;
  error: string | undefined;
};

export const initialModel: LearningsModel = {
  config: undefined,
  isLoading: false,
  error: undefined,
};

export type LearningsMessage =
  | { type: "FETCH_REQUEST" }
  | { type: "FETCH_SUCCESS"; config: LearningsConfig }
  | { type: "FETCH_FAILURE"; error: string }
  | { type: "ADD_REQUEST"; input: AddLearningInput }
  | { type: "ADD_SUCCESS"; input: AddLearningInput }
  | { type: "ADD_FAILURE"; error: string }
  | { type: "UPDATE_REQUEST"; input: UpdateLearningInput }
  | { type: "UPDATE_SUCCESS"; input: UpdateLearningInput }
  | { type: "UPDATE_FAILURE"; error: string }
  | { type: "REMOVE_REQUEST"; input: RemoveLearningsInput }
  | { type: "REMOVE_SUCCESS"; input: RemoveLearningsInput }
  | { type: "REMOVE_FAILURE"; error: string }
  | { type: "SET_REQUEST"; entries: string[] }
  | { type: "SET_SUCCESS"; entries: string[] }
  | { type: "SET_FAILURE"; error: string }
  | { type: "CLEAR_REQUEST" }
  | { type: "CLEAR_SUCCESS" }
  | { type: "CLEAR_FAILURE"; error: string };
