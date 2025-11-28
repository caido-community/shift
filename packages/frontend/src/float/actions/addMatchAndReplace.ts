/* eslint-disable prefer-const */
import {
  type MatchReplaceMatcherName,
  type MatchReplaceMatcherRaw,
  type MatchReplaceOperationBody,
  type MatchReplaceOperationFirstLine,
  type MatchReplaceOperationHeader,
  type MatchReplaceOperationMethod,
  type MatchReplaceOperationPath,
  type MatchReplaceOperationQuery,
  type MatchReplaceReplacerTerm,
  type MatchReplaceReplacerWorkflow,
  type MatchReplaceSection,
} from "@caido/sdk-frontend";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const sectionEnum = z.enum([
  "SectionRequestBody",
  "SectionResponseBody",
  "SectionRequestFirstLine",
  "SectionResponseFirstLine",
  "SectionResponseStatusCode",
  "SectionRequestHeader",
  "SectionResponseHeader",
  "SectionRequestQuery",
  "SectionRequestMethod",
  "SectionRequestPath",
]);

const matcherTypeEnum = z.enum([
  "MatcherRawRegex",
  "MatcherRawValue",
  "MatcherRawFull",
  "MatcherName",
]);

const replacerTypeEnum = z.enum(["ReplacerTerm", "ReplacerWorkflow"]);

export const addMatchAndReplaceSchema = z.object({
  name: z.literal("addMatchAndReplace"),
  parameters: z.object({
    ruleName: z
      .string()
      .describe("Name of the match and replace rule (non-empty)"),
    section: sectionEnum.describe("Section to apply rule to"),
    operation: z.string().describe("Operation type for the rule (non-empty)"),
    matcherType: matcherTypeEnum
      .nullable()
      .describe(
        "Type of matcher to use. Can be null if operation doesn't use a matcher",
      ),
    matcher: z
      .string()
      .nullable()
      .describe("Matcher pattern or value. Can be null if matcherType is null"),
    replacerType: replacerTypeEnum
      .nullable()
      .describe(
        "Type of replacer to use. Can be null if operation doesn't involve replacement",
      ),
    replacer: z
      .string()
      .nullable()
      .describe(
        "Replacement pattern or value. Can be null if replacerType is null",
      ),
    query: z
      .string()
      .describe("HTTPQL query filter. Use empty string if not provided."),
  }),
});

export type AddMatchAndReplaceInput = z.infer<typeof addMatchAndReplaceSchema>;

type MatchReplaceOperation =
  | MatchReplaceOperationPath
  | MatchReplaceOperationHeader
  | MatchReplaceOperationMethod
  | MatchReplaceOperationBody
  | MatchReplaceOperationQuery
  | MatchReplaceOperationFirstLine;

// TODO: refactor this
export const addMatchAndReplace: ActionDefinition<AddMatchAndReplaceInput> = {
  name: "addMatchAndReplace",
  description:
    "Create a new match and replace rule with specified configuration",
  inputSchema: addMatchAndReplaceSchema,
  execute: async (
    sdk: FrontendSDK,
    {
      ruleName,
      section,
      operation,
      matcherType,
      matcher,
      replacerType,
      replacer,
      query,
    }: AddMatchAndReplaceInput["parameters"],
  ) => {
    try {
      let crMatcher: MatchReplaceMatcherRaw | MatchReplaceMatcherName;
      let crReplacer: MatchReplaceReplacerTerm | MatchReplaceReplacerWorkflow;
      let crOperation: MatchReplaceOperation;
      let crSection: MatchReplaceSection;

      switch (matcherType) {
        case "MatcherRawRegex":
          crMatcher = {
            kind: "MatcherRawRegex",
            regex: matcher!,
          };
          break;
        case "MatcherRawValue":
          crMatcher = {
            kind: "MatcherRawValue",
            value: matcher!,
          };
          break;
        case "MatcherName":
          crMatcher = {
            kind: "MatcherName",
            name: matcher!,
          };
          break;
        case "MatcherRawFull":
          crMatcher = {
            kind: "MatcherRawFull" as const,
          };
          break;
        case undefined:
        case null:
          break;
        default:
          throw new Error(`Invalid matcher type: ${matcherType}`);
      }
      switch (replacerType) {
        case "ReplacerTerm":
          crReplacer = {
            kind: "ReplacerTerm" as const,
            term: replacer!,
          };
          break;
        case "ReplacerWorkflow":
          crReplacer = {
            kind: "ReplacerWorkflow",
            workflowId: replacer!,
          };
          break;
        case undefined:
        case null:
          break;
        default:
          throw new Error(`Invalid replacer type: ${replacerType}`);
      }
      /// MatchReplaceSectionRequestBody | MatchReplaceSectionRequestFirstLine | MatchReplaceSectionRequestHeader | MatchReplaceSectionRequestMethod |
      // MatchReplaceSectionRequestPath | MatchReplaceSectionRequestQuery | MatchReplaceSectionResponseBody | MatchReplaceSectionResponseFirstLine |
      // MatchReplaceSectionResponseHeader | MatchReplaceSectionResponseStatusCode
      const tempOperation: Record<string, unknown> = { kind: operation };
      const operationMap: Record<string, string[]> = {
        OperationStatusCodeUpdate: ["replacer"],
        OperationQueryRaw: ["matcher", "replacer"],
        OperationQueryAdd: ["matcher", "replacer"],
        OperationQueryRemove: ["matcher"],
        OperationQueryUpdate: ["matcher", "replacer"],
        OperationPathRaw: ["matcher", "replacer"],
        OperationBodyRaw: ["matcher", "replacer"],
        OperationFirstLineRaw: ["matcher", "replacer"],
        OperationHeaderRaw: ["matcher", "replacer"],
        OperationHeaderUpdate: ["matcher", "replacer"],
        OperationHeaderAdd: ["matcher", "replacer"],
        OperationHeaderRemove: ["matcher"],
        OperationMethodUpdate: ["replacer"],
      };
      const operationFields = operationMap[operation] || [];
      if (operationFields.includes("matcher")) {
        // If the operation requires a matcher
        if (matcherType !== undefined && matcherType !== null) {
          tempOperation.matcher = crMatcher!;
        } else {
          throw new Error(`Matcher is required for operation: ${operation}`);
        }
      }
      if (operationFields.includes("replacer")) {
        // If the operation requires a replacer
        if (replacerType) {
          tempOperation.replacer = crReplacer!;
        } else {
          throw new Error(`Replacer is required for operation: ${operation}`);
        }
      }
      crOperation = tempOperation as MatchReplaceOperation;
      crSection = {
        kind: section,
        operation: crOperation,
      } as MatchReplaceSection;

      const res = await sdk.matchReplace.createRule({
        name: ruleName,
        section: crSection,
        collectionId: "1",
        query: query || "",
      });

      if (res !== undefined && !res.isEnabled) {
        await sdk.matchReplace.toggleRule(res.id, true);
      }

      return actionSuccess(
        `Match and replace rule ${ruleName} created successfully`,
      );
    } catch (error) {
      return actionError("Failed to create match and replace rule", error);
    }
  },
};
