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
export const isDev = window.name.includes("dev") || window.name.includes("local");


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

export enum AgentState {
  Stopped = 'stopped',
  Paused = 'paused',
  Restarted = 'restarted',
  Error = 'error',
  WaitingOnAI = 'running - waiting on ai',
  ReadyToImplementActions = 'idle - ready to implement actions', 
  WaitingOnReplay = 'running - waiting on replay',
  ReadyToTellAI = 'idle - ready to tell ai'
}

// Add this interface for the agent-tab association
export interface AgentTabAssociation {
  conversationId: string;
  agentId: string;
  timestamp: number;
  launchConfig?: {
    jitInstructions: string;
    maxRequests: number;
    dynamicValues: Record<string, any>;
  };
  sessionId: string;
  conversationHistory: Message[];
  agentState: AgentState;
  isActive?: boolean;
  requestCount?: number;
}

export interface Message {
  id: string;
  role: 'AI' | 'agent' | 'user';
  content: string;
  action: Action[];
  timestamp: number;
  halting?: boolean;
  executed?: boolean;
}

export enum AgentActionType {
  matchAndReplace = 'matchAndReplace',
  setBody = 'setBody',
  setPath = 'setPath',
  setMethod = 'setMethod',
  addUpdateHeader = 'addUpdateHeader',
  removeHeader = 'removeHeader',
  addUpdateQueryParam = 'addUpdateQueryParam',
  removeQueryParam = 'removeQueryParam',
}


export interface Action {
  type: AgentActionType;
  params: string[];
}

export interface PluginStorage {
  apiKey: string;
  settings: {
    aiRenameReplayTabs: boolean;
    renameDelay: number;
    renameInstructions: string;
    renameExistingTabs: boolean;
    memory: string | {[projectName: string]: string};
    aiInstructions: string | {[projectName: string]: string};
    alreadyAssessedTabs: {[projectName: string]: string[]};
  };
  agents: Array<{
    id: string;
    name: string;
    instructions: string;
    knowledge: Array<string>;
  }>;
  // Add the new property for agent-tab associations
  agentTabAssociations: {
    [sessionId: string]: AgentTabAssociation
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
    memory: {},
    aiInstructions: {},
    alreadyAssessedTabs: {}
  },
  agents: [{
    id: 'default-agent',
    name: 'HTTP Helper',
    instructions: 'I help analyze and modify HTTP requests. I can help you understand request/response patterns, suggest modifications, and explain security implications.',
    knowledge: [
      'Common HTTP request/response patterns',
      'HTTP security best practices',
      'Web API design principles'
    ]
  }],
  agentTabAssociations: {},
  shiftFloatingPosition: {x: 0, y: 0},
  shiftCommandHistory: [],
  hasSeenTutorial: false
};

