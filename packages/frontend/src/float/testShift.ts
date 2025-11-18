import { registeredActions } from "@/float/actions";
import { getContext } from "@/float/context";
import { type ActionResult } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { getSelectedReplayTabSessionId } from "@/utils";
type StepDecision = "step" | "continue" | "repeat" | "pause" | "stop";

interface TestShiftConsoleControl {
  pending: boolean;
  step: () => void;
  continue: () => void;
  pause: () => void;
  repeat: () => void;
  stop: () => void;
}

type TestShiftOptions = {
  confirmEachStep?: boolean;
  startAtStep?: number;
};

type TestShiftRunner = {
  (run?: boolean, options?: boolean | TestShiftOptions): Promise<void>;
  rerunLast: () => Promise<void>;
  runFrom: (
    stepNumber: number,
    options?: boolean | TestShiftOptions,
  ) => Promise<void>;
};

let controlResolver: ((decision: StepDecision) => void) | undefined;
let consoleControlObject: TestShiftConsoleControl | undefined;
type RunControlState = {
  confirmationRequired: boolean;
};
let activeControlState: RunControlState | undefined;
let lastRunOptions: boolean | TestShiftOptions | undefined;

const dispatchDecision = (decision: StepDecision) => {
  if (controlResolver !== undefined) {
    const resolver = controlResolver;
    controlResolver = undefined;
    if (consoleControlObject !== undefined) {
      consoleControlObject.pending = false;
    }
    resolver(decision);
  }
};

const ensureConsoleControl = (): TestShiftConsoleControl => {
  if (consoleControlObject === undefined) {
    consoleControlObject = {
      pending: false,
      step: () => {
        if (activeControlState !== undefined) {
          activeControlState.confirmationRequired = true;
        }
        if (controlResolver !== undefined) {
          dispatchDecision("step");
        } else {
          console.info(
            "[Shift Test] No pending step decision. Confirmation remains enabled.",
          );
        }
      },
      continue: () => {
        if (activeControlState !== undefined) {
          activeControlState.confirmationRequired = false;
        }
        if (consoleControlObject !== undefined) {
          consoleControlObject.pending = false;
        }
        if (controlResolver !== undefined) {
          dispatchDecision("continue");
        } else {
          console.info(
            "[Shift Test] Continuing without further confirmations.",
          );
        }
      },
      pause: () => {
        if (activeControlState !== undefined) {
          activeControlState.confirmationRequired = true;
        }
        if (controlResolver !== undefined) {
          dispatchDecision("pause");
        } else {
          if (consoleControlObject !== undefined) {
            consoleControlObject.pending = false;
          }
          console.info(
            "[Shift Test] Confirmation will resume after the current step.",
          );
        }
      },
      repeat: () => dispatchDecision("repeat"),
      stop: () => dispatchDecision("stop"),
    };
  }

  if (window.testShiftControl !== consoleControlObject) {
    window.testShiftControl = consoleControlObject;
  }

  return consoleControlObject;
};

const waitForConsoleDecision = (stepIndex: number): Promise<StepDecision> => {
  const total = testPlan.length;
  const control = ensureConsoleControl();
  control.pending = true;
  console.info(
    `[Shift Test] Step ${stepIndex + 1}/${total} finished. Use window.testShiftControl.step(), .continue(), .pause(), .repeat(), or .stop() to proceed.`,
  );
  return new Promise<StepDecision>((resolve) => {
    controlResolver = resolve;
  });
};

const normalizeOptions = (
  options?: boolean | TestShiftOptions,
): TestShiftOptions => {
  if (typeof options === "boolean") {
    return { confirmEachStep: options };
  }

  return options !== undefined ? { ...options } : {};
};

declare global {
  interface Window {
    testShift?: TestShiftRunner;
    testShiftControl?: TestShiftConsoleControl;
  }
}

export const setupTestShift = (sdk: FrontendSDK) => {
  if (window.name !== "dev") {
    return;
  }

  if (typeof window.testShift === "function") {
    return;
  }

  let isRunning = false;

  const runner: TestShiftRunner = async (
    run?: boolean,
    options?: boolean | TestShiftOptions,
  ) => {
    if (run !== true) {
      window.alert(INSTRUCTION_MESSAGE);
      return;
    }

    if (isRunning) {
      console.warn("[Shift Test] Already running");
      return;
    }

    isRunning = true;

    const suffix = `${Date.now()}`;
    const state: TestState = {};
    const results: TestResult[] = [];
    const normalizedOptions = normalizeOptions(options);
    const { confirmEachStep, startAtStep } = normalizedOptions;
    let aborted = false;
    let startIndex = 0;

    if (startAtStep !== undefined) {
      const stepNumber = Math.trunc(startAtStep);
      if (
        Number.isNaN(stepNumber) ||
        stepNumber < 1 ||
        stepNumber > testPlan.length
      ) {
        console.warn(
          `[Shift Test] startAtStep ${startAtStep} is invalid. Must be between 1 and ${testPlan.length}.`,
        );
      } else {
        startIndex = stepNumber - 1;
      }
    }

    lastRunOptions = options;
    controlResolver = undefined;
    ensureConsoleControl().pending = false;

    const helpers: TestHelpers = {
      sdk,
      state,
      suffix,
      delay,
      log: (...values: unknown[]) => console.log("[Shift Test]", ...values),
      setReplaySessionIdFromDOM: () => {
        const sessionId = getSelectedReplayTabSessionId();
        state.replaySessionId =
          sessionId !== undefined && sessionId !== null && sessionId !== ""
            ? sessionId
            : undefined;
      },
      ensureActiveEditorFocus: () => {
        const editor = sdk.window.getActiveEditor();
        editor?.focus();
      },
      ensureActiveEditorSelection: () => {
        ensureSelectionInEditor(sdk);
      },
      runAction: async (name, parameters) => {
        const result = await runActionByName(sdk, name, parameters, suffix);
        results.push(result);
        return result;
      },
      ensureEnvironmentForMutations: async () => {
        await ensureEnvironment(sdk, suffix, state);
      },
      ensureHostedFileForRemoval: async () => {
        await ensureHostedFile(sdk, suffix, state);
      },
      ensureConvertWorkflowId: () => {
        hydrateConvertWorkflowId(sdk, state);
      },
      closeOpenDialogs: () => {
        closeDialogsIfPresent();
      },
    };

    console.group("[Shift Test] Starting run");
    if (startIndex > 0) {
      console.info(
        `[Shift Test] Jumping to step ${startIndex + 1} of ${testPlan.length}.`,
      );
    }
    try {
      const controlState: RunControlState = {
        confirmationRequired: confirmEachStep === true,
      };
      activeControlState = controlState;
      outer: for (let index = startIndex; index < testPlan.length; index += 1) {
        let shouldRepeat = true;
        while (shouldRepeat) {
          const step = testPlan[index];
          if (step === undefined) {
            break outer;
          }
          try {
            helpers.ensureActiveEditorFocus();
            await step(helpers);
            await helpers.delay();
          } catch (stepError) {
            console.error("[Shift Test] Step failed", stepError);
          }

          if (!controlState.confirmationRequired) {
            shouldRepeat = false;
            continue;
          }

          const decision = await waitForConsoleDecision(index);
          switch (decision) {
            case "step": {
              controlState.confirmationRequired = true;
              shouldRepeat = false;
              break;
            }
            case "continue": {
              controlState.confirmationRequired = false;
              shouldRepeat = false;
              break;
            }
            case "repeat": {
              console.info(`[Shift Test] Re-running step ${index + 1}`);
              break;
            }
            case "stop": {
              aborted = true;
              break outer;
            }
            case "pause": {
              controlState.confirmationRequired = true;
              shouldRepeat = false;
              break;
            }
            default: {
              shouldRepeat = false;
              break;
            }
          }
        }
      }
    } finally {
      console.groupEnd();
      isRunning = false;
      ensureConsoleControl().pending = false;
      controlResolver = undefined;
      activeControlState = undefined;
      closeDialogsIfPresent();
    }

    const successes = results.filter((result) => result.success).length;
    const failures = results.length - successes;

    let summary = `Shift test run ${
      aborted ? "stopped" : "complete"
    }.\n\nSuccesses: ${successes}\nFailures: ${failures}`;

    if (failures > 0) {
      summary += "\n\nInspect console for failure details.";
    }

    window.alert(summary);
  };

  runner.rerunLast = async () => {
    if (lastRunOptions === undefined) {
      console.warn("[Shift Test] No previous test run to rerun");
      return;
    }

    await runner(true, lastRunOptions);
  };

  runner.runFrom = async (
    stepNumber: number,
    options?: boolean | TestShiftOptions,
  ) => {
    const mergedOptions =
      typeof options === "boolean"
        ? { confirmEachStep: options }
        : { ...(options ?? {}) };

    mergedOptions.startAtStep = stepNumber;
    await runner(true, mergedOptions);
  };

  window.testShift = runner;
};

type TestResult = {
  name: string;
  success: boolean;
  message: string;
};

type TestState = {
  replaySessionId?: string;
  filterId?: string;
  scopeId?: string;
  environmentId?: string;
  hostedFileId?: string;
  convertWorkflowId?: string;
};

type TestHelpers = {
  sdk: FrontendSDK;
  state: TestState;
  suffix: string;
  runAction: (
    name: string,
    parameters: Record<string, unknown>,
  ) => Promise<TestResult>;
  delay: (ms?: number) => Promise<void>;
  log: (...values: unknown[]) => void;
  setReplaySessionIdFromDOM: () => void;
  ensureActiveEditorFocus: () => void;
  ensureActiveEditorSelection: () => void;
  ensureEnvironmentForMutations: () => Promise<void>;
  ensureHostedFileForRemoval: () => Promise<void>;
  ensureConvertWorkflowId: () => void;
  closeOpenDialogs: () => void;
};

type TestStep = (helpers: TestHelpers) => Promise<void>;

const ACTIONS_BY_NAME = new Map(
  registeredActions.map((action) => [action.name, action]),
);

const INSTRUCTION_MESSAGE = [
  "Shift Float test harness",
  "",
  "Usage:",
  "  window.testShift()            → show these instructions",
  "  window.testShift(true)        → run the automated test plan",
  "  window.testShift(true, { confirmEachStep: true })",
  "                               → unlock console controls after each step",
  "  window.testShift(true, { startAtStep: 5 })",
  "                               → begin the run at step 5 (1-indexed)",
  "  window.testShift.runFrom(5)   → shorthand to start at step 5",
  "  window.testShift?.rerunLast() → rerun the most recent Shift test",
  "  window.testShiftControl.step()",
  "                               → advance a single confirmed step",
  "  window.testShiftControl.continue()",
  "                               → continue running without confirmations",
  "  window.testShiftControl.pause()",
  "                               → resume confirmations after continuing",
  "",
  "Prerequisites:",
  '  • Run inside the Caido dev shell (window.name === "dev").',
  "  • Switch to a temporary project – the test creates and deletes data.",
  "  • Open a Replay tab so request-focused actions have an editor.",
  "",
  "What happens when you run the test:",
  "  • Each registered Float action executes with canned inputs.",
  "  • The harness logs every action, its raw parameters, and the result.",
  "  • Auxiliary resources (scopes, filters, environments, files, etc.)",
  "    are created and cleaned up where possible.",
  "",
  "Look at the browser console while the test runs for live progress.",
].join("\n");

const DEFAULT_DELAY_MS = 2000;

const delay = (ms: number = DEFAULT_DELAY_MS) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const closeDialogsIfPresent = () => {
  const dialogs = document.querySelectorAll(".p-dialog");
  dialogs.forEach((dialog) => {
    const confirmButton = dialog.querySelector(
      '[data-pc-section="footer"] button',
    );
    if (confirmButton instanceof HTMLElement) {
      confirmButton.click();
    }
  });
};

const ensureSelectionInEditor = (sdk: FrontendSDK) => {
  const editor = sdk.window.getActiveEditor();
  if (editor === null) {
    return;
  }
};

const runActionByName = async (
  sdk: FrontendSDK,
  name: string,
  parameters: Record<string, unknown>,
  suffix: string,
): Promise<TestResult> => {
  const action = ACTIONS_BY_NAME.get(name);

  if (action === undefined) {
    const message = `Action ${name} is not registered`;
    console.warn("[Shift Test] %s", message);
    return {
      name,
      success: false,
      message,
    };
  }

  console.groupCollapsed(`[Shift Test] ${name}`, JSON.stringify(parameters));
  console.log("[Shift Test] parameters", parameters);

  let result: ActionResult;
  try {
    result = await action.execute(sdk, parameters, getContext(sdk));
  } catch (error) {
    console.error("[Shift Test] execution threw", error);
    console.groupEnd();
    return {
      name,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  console.log("[Shift Test] result", result);
  console.groupEnd();

  if (result.success) {
    return {
      name,
      success: true,
      message: result.frontend_message,
    };
  }

  return {
    name,
    success: false,
    message: result.error,
  };
};

const hydrateConvertWorkflowId = (sdk: FrontendSDK, state: TestState) => {
  if (state.convertWorkflowId !== undefined) {
    return;
  }

  try {
    const workflows = sdk.workflows.getWorkflows?.();
    if (Array.isArray(workflows)) {
      state.convertWorkflowId = workflows[0]?.id;
    }
  } catch (error) {
    console.warn("[Shift Test] Failed to load workflows", error);
  }
};

const ensureHostedFile = async (
  sdk: FrontendSDK,
  suffix: string,
  state: TestState,
) => {
  if (state.hostedFileId !== undefined) {
    return;
  }

  try {
    const file = new File(
      [`Shift automated test file ${suffix}`],
      `shift-test-${suffix}.txt`,
      {
        type: "text/plain",
      },
    );
    const created = await sdk.files.create(file);
    if (created !== undefined && created !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state.hostedFileId = (created as any).id as string | undefined;
    }
  } catch (error) {
    console.warn("[Shift Test] Failed to create hosted file", error);
  }
};

const ensureEnvironment = async (
  sdk: FrontendSDK,
  suffix: string,
  state: TestState,
) => {
  if (state.environmentId !== undefined) {
    return;
  }

  try {
    const result = await sdk.graphql.createEnvironment({
      input: {
        name: `Shift Test Environment ${suffix}`,
        variables: [],
      },
    });

    const environment = result?.createEnvironment?.environment;
    if (environment !== undefined && environment !== null) {
      state.environmentId = environment.id;
    }
  } catch (error) {
    console.warn("[Shift Test] Failed to seed environment", error);
  }
};

const testPlan: TestStep[] = [
  async ({ runAction, delay: localDelay }) => {
    await runAction("navigate", { path: "#/http-history" });
    await localDelay(1000);
    await runAction("navigate", { path: "#/replay" });
    await localDelay(1000);
    await runAction("navigate", { path: "#/http-history" });
  },
  async ({ runAction }) => {
    await runAction("httpqlSetQuery", {
      query: 'resp.raw.cont:"Shift Test' + Math.random() + '" ',
    });
  },
  async ({ runAction }) => {
    await runAction("toast", { content: "Shift Float test toast" });
  },
  async ({
    runAction,
    suffix,
    setReplaySessionIdFromDOM,
    delay: localDelay,
  }) => {
    await runAction("navigate", { path: "#/replay" });
    await localDelay(1000);
    const rawRequest = [
      `GET /shift-test-${suffix}?foo=bar HTTP/1.1`,
      "Host: example.com",
      "",
      "",
    ].join("\r\n");
    await runAction("createReplaySession", {
      rawRequest,
      host: "example.com",
      port: 443,
      isTls: true,
      name: `Shift Test ${suffix}`,
    });
    await localDelay(750);
    setReplaySessionIdFromDOM();
  },
  async ({ runAction, suffix, state }) => {
    await runAction("renameReplayTab", {
      newName: `Shift Replay ${suffix}`,
      sessionId: state.replaySessionId ?? "",
    });
  },
  async ({ runAction, suffix }) => {
    const newRequest = [
      `POST /shift-test-${suffix} HTTP/1.1`,
      "Host: example.com",
      "Content-Type: application/json",
      "",
      JSON.stringify({ hello: "world", suffix }),
    ].join("\r\n");
    await runAction("replayRequestReplace", { text: newRequest });
  },
  async ({ ensureActiveEditorSelection, runAction }) => {
    ensureActiveEditorSelection();
    await runAction("activeEditorReplaceSelection", {
      text: "replaced-selection",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorReplaceByString", {
      match: "application/json",
      replace: "application/xml",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorReplaceBody", {
      body: '{"shift":"body"}',
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorAddHeader", {
      header: "X-Shift-Test: 123",
      replace: true,
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorAddQueryParameter", {
      name: "shift-param",
      value: "one",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorRemoveQueryParameter", {
      name: "shift-param",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorUpdatePath", {
      path: "/shift/test-path",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorRemoveHeader", {
      headerName: "X-Shift-Test",
    });
  },
  async ({ runAction }) => {
    await runAction("activeEditorSetMethod", {
      method: "PATCH",
    });
  },
  async ({ runAction }) => {
    await runAction("sendReplayTab", {});
  },
  async ({ runAction, suffix }) => {
    await runAction("navigate", { path: "#/tamper" });
    await delay(1000);
    await runAction("addMatchAndReplace", {
      name: `Shift Rule ${suffix}`,
      section: "SectionRequestHeader",
      operation: "OperationHeaderAdd",
      matcherType: "MatcherName",
      matcher: "X-Shift-Rule",
      replacerType: "ReplacerTerm",
      replacer: "RuleValue",
      query: 'req.method.eq:"GET"',
    });
  },
  async ({ runAction, suffix }) => {
    //Not working - this is not selecting the payload
    const automateRequest = [
      `GET /shift-automate-${suffix}?id=§§§payload§§§ HTTP/1.1`,
      "Host: example.com",
      "",
    ].join("\r\n");
    await runAction("createAutomateSession", {
      rawRequest: automateRequest,
      host: "example.com",
      port: 443,
      isTls: true,
      strategy: "ALL",
      concurrency: {
        delay: 10,
        workers: 1,
      },
      payloads: [
        {
          kind: "List",
          list: ["one", "two"],
        },
      ],
    });
  },
  async ({ runAction, suffix, sdk, state }) => {
    await runAction("navigate", { path: "#/filter" });
    await delay(1000);
    const filterName = `Shift Test Filter ${suffix}`;
    await runAction("addFilter", {
      name: filterName,
      query: 'req.method.eq:"GET"',
      alias: `shifttest`,
    });

    try {
      const filters = sdk.filters.getAll();
      const created = filters.find((filter) => filter.name === filterName);
      state.filterId = created?.id;
    } catch (error) {
      console.warn("[Shift Test] Unable to locate created filter", error);
    }
  },
  async ({ runAction, suffix, state }) => {
    await runAction("updateFilter", {
      id: state.filterId ?? "",
      name: `Shift Test Filter ${suffix} Updated`,
      alias: `shifttest`,
      query: 'req.method.eq:"POST"',
    });
  },
  async ({ runAction, state }) => {
    await runAction("filterAppendQuery", {
      id: state.filterId ?? "",
      appendQuery: 'AND req.host.cont:"example.com"',
    });
  },
  async ({ runAction, state }) => {
    await runAction("deleteFilter", {
      id: state.filterId ?? "",
    });
  },
  async ({ runAction, suffix, sdk, state }) => {
    await runAction("navigate", { path: "#/scope" });
    await delay(1000);
    const scopeName = `Shift Scope ${suffix}`;
    await runAction("addScope", {
      name: scopeName,
      allowlist: ["*rhynorater.com*"],
      denylist: [],
    });
    try {
      const scopes = sdk.scopes.getScopes();
      const created = scopes.find((scope) => scope.name === scopeName);
      state.scopeId = created?.id?.toString();
    } catch (error) {
      console.warn("[Shift Test] Unable to locate created scope", error);
    }
  },
  async ({ runAction, suffix, state }) => {
    await runAction("updateScope", {
      id: state.scopeId ?? "",
      name: `Shift Scope ${suffix} Updated`,
      allowlist: ["*rhynorater.com*", "*shift.dev*"],
      denylist: [],
    });
  },
  async ({ runAction, state }) => {
    await runAction("deleteScope", {
      id: state.scopeId ?? "",
    });
  },
  async ({ runAction, suffix, closeOpenDialogs }) => {
    await runAction("navigate", { path: "#/files" });
    await delay(1000);
    await runAction("createHostedFile", {
      file_name: `shift-test-${suffix}.txt`,
      content: "Shift hosted file body",
    });
    closeOpenDialogs();
  },
  async ({ runAction, suffix, closeOpenDialogs }) => {
    await runAction("createHostedFileAdvanced", {
      file_name: `shift-advanced-${suffix}.txt`,
      js_script: "Array.from({length:3}, (_, i) => i).join(',')",
    });
    closeOpenDialogs();
  },
  async ({ ensureHostedFileForRemoval }) => {
    await ensureHostedFileForRemoval();
  },
  async ({ runAction, state }) => {
    await runAction("removeHostedFile", {
      id: state.hostedFileId ?? "",
    });
  },
  async ({ runAction, suffix }) => {
    await runAction("navigate", { path: "#/environment" });
    await delay(1000);
    await runAction("createEnvironment", {
      name: `Shift Env Action ${suffix}`,
      variables: [
        {
          name: "SHIFT_ENV_VAR",
          value: "initial",
          kind: "PLAIN",
        },
      ],
    });
  },
  async ({ ensureEnvironmentForMutations }) => {
    await ensureEnvironmentForMutations();
  },
  async ({ runAction, state }) => {
    await runAction("updateEnvironmentVariable", {
      environmentId: state.environmentId,
      variable: {
        name: "SHIFT_ENV_TOKEN",
        value: "12345",
        kind: "PLAIN",
      },
    });
  },
  async ({ runAction, state }) => {
    await runAction("deleteEnvironmentVariable", {
      environmentId: state.environmentId,
      variableName: "SHIFT_ENV_TOKEN",
    });
  },
  async ({ runAction, state }) => {
    await runAction("deleteEnvironment", {
      id: state.environmentId ?? "",
    });
  },
  async ({ ensureConvertWorkflowId }) => {
    await Promise.resolve().then(() => {
      ensureConvertWorkflowId();
    });
  },
  async ({ runAction, state }) => {
    if (state.convertWorkflowId === undefined) {
      console.warn(
        "[Shift Test] Skipping runConvertWorkflow – no workflows available",
      );
      return;
    }

    await runAction("runConvertWorkflow", {
      id: state.convertWorkflowId,
      input: "c2hpZnQ=",
    });
  },
  async ({ runAction, suffix }) => {
    await runAction("createFinding", {
      title: `Shift Finding ${suffix}`,
      description: "Automated finding created by Shift test harness.",
    });
  },
];
