import { z } from "zod";

export type Result<TOk = void, TErr = string> =
  | { kind: "Ok"; value: TOk }
  | { kind: "Error"; error: TErr };

export const Result = {
  ok: <TOk>(value: TOk): Result<TOk> => ({ kind: "Ok", value }),
  err: <TOk = never, TErr = string>(error: TErr): Result<TOk, TErr> => ({ kind: "Error", error }),
  isResult: (value: unknown): value is Result<unknown, unknown> =>
    typeof value === "object" && value !== null && "kind" in value,
  isOk: <TOk, TErr>(result: Result<TOk, TErr>): result is { kind: "Ok"; value: TOk } =>
    result.kind === "Ok",
  isErr: <TOk, TErr>(result: Result<TOk, TErr>): result is { kind: "Error"; error: TErr } =>
    result.kind === "Error",
  schema: <TOk extends z.ZodTypeAny, TErr extends z.ZodTypeAny = z.ZodString>(
    valueSchema: TOk,
    errorSchema?: TErr
  ) =>
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("Ok"),
        value: valueSchema,
      }),
      z.object({
        kind: z.literal("Error"),
        error: errorSchema ?? z.string(),
      }),
    ]),
};
