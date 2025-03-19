import { Caido } from "@caido/sdk-frontend";
import { AgentTabAssociation, AgentState, API_ENDPOINT, PluginStorage } from "./constants";
import { sendReplayBySessionId, getPluginStorage, getReqAndRespBySessionId, setPluginStorage } from "./utils/caidoUtils";
import logger from "./utils/logger";
import { executeActions, executeAction } from "./agentCommands";
import { generateId } from "./utils/utils";


export const agentLoop = async (caido: Caido, storage: PluginStorage) => {
  logger.log("Agent monitoring - loop started.");
  //try - get lock
  //get current state from storage
  const associations = storage.agentTabAssociations;
  if (Object.keys(associations || {}).length === 0) {
    logger.debug(`No associations found. Doing nothing...`);
    return;
  }

  Object.values(associations).forEach(async (association: AgentTabAssociation) => {
    if (window.shiftAgentCooldown && window.shiftAgentCooldown[association.sessionId] && window.shiftAgentCooldown[association.sessionId] > Date.now()) {
      logger.log(`Agent on cooldown for session ${association.sessionId}`);
      return; // Still on cooldown
    }
    const state = association.agentState;
    if (state === AgentState.WaitingOnReplay || state === AgentState.WaitingOnAI) {
      logger.log(`Agent in waiting state (${state}) for session ${association.sessionId} - async functions will handle state transition`);
      //Do nothing because the async functions will push the state to the correct state
    } else if (state === AgentState.Stopped) {
      logger.log(`Agent stopped for session ${association.sessionId}`);
      //Do nothing because the agent is stopped. Maybe check if agent is started?
    }
    else if (state === AgentState.Restarted) {
      logger.log(`Agent restarting for session ${association.sessionId}`);
      restartAgent(caido, storage, association);
    }
    else if (state === AgentState.ReadyToImplementActions) {
      logger.log(`Agent ready to implement actions for session ${association.sessionId}`);
      agentReadyToImplementActions(caido, storage, association);
    }
    else if (state === AgentState.ReadyToTellAI) {
      logger.log(`Agent ready to tell AI for session ${association.sessionId}`);
      agentReadyToTellAI(caido, storage, association);
    }
    else if (state === AgentState.Error) {
      logger.log(`Agent in error state for session ${association.sessionId}`);
      agentError(caido, storage, association);
    }
  });
  //catch - release lock
};

const restartAgent = async (caido: Caido, storage: PluginStorage, association: AgentTabAssociation) => {
  // TODO: Implement restart agent functionality
  logger.log(`Restarting agent for session ${association.sessionId}`);
  
  const tabAssociation = storage.agentTabAssociations?.[association.sessionId];
  if (tabAssociation) {
    tabAssociation.agentState = AgentState.ReadyToTellAI;
    await writeToStorage(caido, storage, association);
    return await agentReadyToTellAI(caido, storage, association);
  }
};

const agentReadyToImplementActions = async (caido: Caido, storage: PluginStorage, association: AgentTabAssociation) => {
  logger.log(`Agent ready to implement actions for session ${association.sessionId}`);

  // Get the latest conversation history
  const conversationHistory = association.conversationHistory;
  if (!conversationHistory?.length) {
    logger.error('No conversation history found');
    return;
  }

  // Find the last unexecuted message with actions
  const messageToExecute = conversationHistory
    .reverse()
    .find(msg => msg.action?.length && !msg.executed);

  if (!messageToExecute?.action?.length) {
    logger.log('Storage:', storage);
    logger.log('Association:', association);
    logger.error('No unexecuted actions found in conversation history');
    return;
  }

  try {
    // Get the current request
    const { request } = await getReqAndRespBySessionId(caido, { sessionId: association.sessionId });
    if (!request) {
      throw new Error('Could not get request data');
    }

    // Execute each action in sequence
    let modifiedRequest = request;
    for (const action of messageToExecute.action) {
      modifiedRequest = await executeActions(caido, [action], modifiedRequest);
    }

    // Send the modified request
    const tabAssociation = storage.agentTabAssociations?.[association.sessionId];
    tabAssociation.agentState = AgentState.WaitingOnReplay;
    await writeToStorage(caido, storage, association);

    await sendReplayBySessionId(caido, association.sessionId, modifiedRequest).then(async () => {
      const freshStorage = await getPluginStorage(caido);
      logger.log("Fresh storage 2:", freshStorage);
      const newTabAssociation = freshStorage.agentTabAssociations?.[association.sessionId];
      const updatedHistory = newTabAssociation.conversationHistory.map(msg => 
        msg.id === messageToExecute.id ? {...msg, executed: true} : msg
      );
      newTabAssociation.conversationHistory = updatedHistory;
      newTabAssociation.agentState = AgentState.ReadyToTellAI;
      await writeToStorage(caido, freshStorage, association);
    }).catch(async (error) => {
      logger.error('Error sending replay:', error);
      const freshStorage = await getPluginStorage(caido);
      const newTabAssociation = freshStorage.agentTabAssociations?.[association.sessionId];
      if (newTabAssociation) {
        newTabAssociation.agentState = AgentState.Error;
        await writeToStorage(caido, freshStorage, association);
      }
    });

  } catch (error) {
    logger.error('Error implementing actions:', error);
    const storage = await getPluginStorage(caido);
    const tabAssociation = storage.agentTabAssociations?.[association.sessionId];
    if (tabAssociation) {
      tabAssociation.agentState = AgentState.Error;
      await writeToStorage(caido, storage, association);
    }
  }
};

const agentReadyToTellAI = async (caido: Caido, storage: PluginStorage, association: AgentTabAssociation) => {
  // Sanity check to ensure we're in the correct state before proceeding
  const currentAssociation = storage.agentTabAssociations?.[association.sessionId];
  if (currentAssociation?.agentState !== AgentState.ReadyToTellAI) {
    logger.error(`Agent state mismatch - expected ${AgentState.ReadyToTellAI} but got ${currentAssociation?.agentState}`);
    return;
  }
  const agent = storage.agents.find(agent => agent.id === association.agentId);
  if (!agent) {
    logger.error(`Agent not found for session ${association.sessionId}`);
    return;
  }

  logger.log(`Agent ready to tell AI for session ${association.sessionId}`);
  const sessionIdParam = { sessionId: association.sessionId };
  let replayStateData = await getReqAndRespBySessionId(caido, sessionIdParam);
  
  if (!replayStateData) {
    logger.error(`No replay state data found for session ${association.sessionId}`);
    return;
  }
  let ts = Date.now();
  currentAssociation.conversationHistory.push({
    id: generateId(),
    role: 'agent',
    content: `Agent Sent Request&Response to AI at ${new Date(ts).toLocaleString()}`,
    action: [],
    timestamp: ts
  });
  currentAssociation.agentState = AgentState.WaitingOnAI;
  await writeToStorage(caido, storage, association);
  fetch(`${API_ENDPOINT}/agent`, {
    method: 'POST',
    body: JSON.stringify({
      conversationId: association.conversationId,
      request: replayStateData.request,
      response: replayStateData.response,
      conversationHistory: association.conversationHistory,
      agent: agent,
      JITInstructions: association.launchConfig?.jitInstructions,
      additionalInstructions: association.launchConfig?.dynamicValues,
    })
  }).then(async (response) => {
    const responseData = await response.json();
    const freshStorage = await getPluginStorage(caido);
    logger.log("Fresh storage:", freshStorage);
    
    // Ensure agentTabAssociations exists and has the session entry with required properties
    const tabAssociation = freshStorage.agentTabAssociations?.[association.sessionId];
    if (tabAssociation && tabAssociation.conversationHistory) {
      tabAssociation.agentState = AgentState.ReadyToImplementActions;
      let ts = Date.now();
      tabAssociation.conversationHistory.push({
        id: responseData.messageId,
        role: 'AI',
        executed: false,
        halting: responseData.halting,
        content: responseData.message + " AI Response at " + new Date(ts).toLocaleString() || '',
        action: responseData.actions || [],
        timestamp: ts
      });
      logger.log("Updated conversation history after AI call:", tabAssociation.conversationHistory);
      await writeToStorage(caido, freshStorage, association);
    }
  }).catch(async (error) => {
    logger.error(`Error initializing agent: ${error}`);
    const freshStorage = await getPluginStorage(caido);
    const tabAssociation = freshStorage.agentTabAssociations?.[association.sessionId];
    if (tabAssociation) {
      tabAssociation.agentState = AgentState.Error;
      await writeToStorage(caido, freshStorage, association);
    }
  });
  
  return;
};

const agentError = async (caido: Caido, storage: PluginStorage, association: AgentTabAssociation) => {
  // TODO: Implement error handling functionality
  logger.error(`Agent encountered an error for session ${association.sessionId}`);
  
  // This is a placeholder - actual implementation would handle error recovery
  // or notify the user of the error
};

export const initAgentMonitoring = async (caido: Caido) => {
  // Start monitoring agent states every second
  // caido.storage.onChange(async (storage:any) => {
  window.setInterval(async () => {
    const storage = await getPluginStorage(caido);
    if (Object.keys(storage.agentTabAssociations || {}).length > 0) {
      await agentLoop(caido, storage);
    }
  }, 1000);
};

const writeToStorage = async (caido: Caido, storage: PluginStorage, association: AgentTabAssociation) => {
  if (window.shiftAgentCooldown && window.shiftAgentCooldown[association.sessionId] && window.shiftAgentCooldown[association.sessionId] > Date.now()) {
    return; // Still on cooldown
  }
  await setPluginStorage(caido, storage);
}