import manifest from '../../../manifest.json';

export enum ActiveEntity {
  AutomateRequestPreLaunch = 'automateRequestPreLaunch',
  AutomateRequest = 'automateRequest',
  AutomateResponse = 'automateResponse',
  ReplayRequest = 'replayRequest',
  ReplayResponse = 'replayResponse',
  HttpHistoryRequest = 'httpHistoryRequest',
  HttpHistoryResponse = 'httpHistoryResponse',
  HttpHistoryRow = 'httpHistoryRow',
  HTTPQL = 'httpql',
  MatchAndReplace = 'matchAndReplace',
  InterceptRequest = 'interceptRequest',
  InterceptResponse = 'interceptResponse',
  SearchRequest = 'searchRequest',
  SearchResponse = 'searchResponse',
  SearchRow = 'searchRow',
  Unknown = 'unknown',
  Shift = 'shift'
}
export const PAGE = "/shift";
export const PROD_API_ENDPOINT = "https://api.shiftplugin.com/api/shift";
export const DEV_API_ENDPOINT = "https://poc.rhynorater.com/shiftQuery.php?";
export const API_ENDPOINT = window.name.includes("devapi") ? DEV_API_ENDPOINT : PROD_API_ENDPOINT;
export const isDev = window.name.includes("dev");


export const CONTEXT_ENDPOINT = "/context";
export const QUERY_ENDPOINT = "/query";

// Max size of request and response in bytes
export const MAX_SIZE = 30 * 1024; // 30kb in bytes

export const CURRENT_VERSION = manifest.version;

export const MAX_UNDO_HISTORY = 15;

export const PLACEHOLDER_AI_INSTRUCTIONS = "Example: If I type 'rcw' interpret it as 'Run Convert Workflow'\nIf I provide you with a JS snippet that looks like its building an HTTP request, return a JSON object that will be used as the request body\nIf I type the name of something in memory, return just that string.";
export const PLACEHOLDER_MEMORY = "Example: USERA Admin Account ID: 12345\nUSERB Admin Account ID: 67890\nOrganization ID: 98765";
export const PLACEHOLDER_PROMPT="Query Shift..."

export const DEFAULT_RENAME_INSTRUCTIONS = "Include the HTTP Verb, and a concise version of the path in the tab name. Focus on the end of the path. Include only the first 4 characters of IDs.\nExample: GET /api/v1/users/{id}/profile";

export interface PluginStorage {
  apiKey: string;
  settings: {
    aiRenameReplayTabs: boolean;
    renameDelay: number;
    renameInstructions: string;
    renameExistingTabs: boolean;
    memory: string;
    aiInstructions: string;
    alreadyAssessedTabs: {[projectName: string]: string[]};
  };
  shiftFloatingPosition: {x: number, y: number};
  shiftCommandHistory: string[];
  hasSeenTutorial: boolean;
}

export const DEFAULT_PLUGIN_STORAGE: PluginStorage = {
  apiKey: '',
  settings: {
    aiRenameReplayTabs: false,
    renameDelay: 60,
    renameInstructions: DEFAULT_RENAME_INSTRUCTIONS,
    renameExistingTabs: false,
    memory: '',
    aiInstructions: '',
    alreadyAssessedTabs: {}
  },
  shiftFloatingPosition: {x: 100, y: 100},
  shiftCommandHistory: [],
  hasSeenTutorial: false
};