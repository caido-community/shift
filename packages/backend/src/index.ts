import type { DefineAPI } from "caido:plugin";
import { type BackendSDK } from "./types";
export { type BackendEvents } from "./types";
import { fetch, Request } from "caido:http";
import { z } from "zod";

export type API = DefineAPI<{
  authenticate: typeof authenticate;
}>;

export function init(sdk: BackendSDK) {
  sdk.api.register("authenticate", authenticate);
}

const AuthenticateSuccessSchema = z.object({
  api_key: z.string(),
  message: z.string(),
});

type AuthenticateResponse =
  | { kind: "Success"; api_key: string; message: string }
  | { kind: "Error"; error: string };

const authenticate = async (
  sdk: BackendSDK,
  caidoToken: string
): Promise<AuthenticateResponse> => {
  try {
    const fetchRequest = new Request("https://api.shiftplugin.com/api/caido/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: caidoToken,
      }),
    });
    const response = await fetch(fetchRequest);

    if (!response.ok) {
      return {
        kind: "Error",
        error: `Authentication failed: ${response.statusText}`
      };
    }

    const data = await response.json();
    const validationResult = AuthenticateSuccessSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        kind: "Error",
        error: `Invalid response format: ${validationResult.error.message}`
      };
    }

    return {
      kind: "Success",
      api_key: validationResult.data.api_key,
      message: validationResult.data.message
    };
  } catch (error) {
    return {
      kind: "Error",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};
