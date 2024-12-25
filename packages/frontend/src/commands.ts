import { getCurrentReplayEditors, getCurrentlySelectedReplayTabSessionId, sendCurrentReplayTab, navigateToSidebarTab, getCurrentScope, switchToAutomateTab} from "./utils/caidoUtils";
import { ref, createApp } from 'vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import logger from "./utils/logger";
import { parsePayloads } from "./utils/commandUtils";


//This file should only contain actionFunctions.
export const actionFunctions = {
  activeEditorReplaceSelection: (caido: any, { text }: { text: string }) => {
    caido.window.getActiveEditor()?.replaceSelectedText(text);
    caido.window.getActiveEditor()?.focus();
  },
  activeEditorReplaceByString: (caido: any, { match, replace }: { match: string, replace: string }) => {
    const editor = caido.window.getActiveEditor()?.getEditorView();
    if (editor) {
      logger.log("activeEditorReplaceByString", { match, replace });
      logger.log("editor", editor);
      const currentText = editor.state.doc.toJSON().join("\r\n");
      const newText = currentText.replace(match, replace);
      editor.dispatch({
        changes: {from: 0, to: editor.state.doc.length, insert: newText}
      });
      editor.focus();
    }
  },
  activeEditorReplaceBody: (caido: any, { body }: { body: string }) => {
    const editor = caido.window.getActiveEditor()?.getEditorView();
    if (editor) {
      const lines = editor.state.doc.toJSON();
      let bodyStartIndex = 0;
      
      // Find first empty line which delimits headers from body
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === '') {
          bodyStartIndex = i;
          break;
        }
      }

      // Calculate the character position where body starts
      // Using \n here because codemirror sees newlines as one char
      const bodyStartPos = lines.slice(0, bodyStartIndex + 1).join('\n').length + 1;
      
      // Replace everything after headers with new body
      editor.dispatch({
        changes: {
          from: bodyStartPos,
          to: editor.state.doc.length,
          insert: body
        }
      });
      editor.focus();
    }
  },
  activeEditorAddHeader: (caido: any, { header, replace = true }: { header: string, replace?: boolean }) => {
    const editor = caido.window.getActiveEditor()?.getEditorView();
    if (editor) {
      const lines = editor.state.doc.toJSON();
      const headerName = header.split(':')[0].trim().toLowerCase();
      
      // Find where headers end (first empty line)
      let headerEndIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === '') {
          headerEndIndex = i;
          break;
        }
      }
      
      // If replace is true, remove existing header if it exists and add new one in its place
      if (replace) {
        for (let i = 0; i < headerEndIndex; i++) {
          if (lines[i].toLowerCase().startsWith(headerName + ':')) {
            // Replace the existing header
            // Using \n here because codemirror sees newlines as one char
            const startOfLine = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
            const endOfLine = startOfLine + lines[i].length;
            editor.dispatch({
              changes: { from: startOfLine, to: endOfLine, insert: header }
            });
            editor.focus();
            return;
          }
        }
      }
      
      // If no existing header was found or replace is false, add at end of headers
      // Using \n here because codemirror sees newlines as one char
      const insertPos = lines.slice(0, headerEndIndex).join('\n').length;
      const prefix = headerEndIndex > 0 ? '\r\n' : '';
      editor.dispatch({
        changes: { from: insertPos, insert: prefix + header }
      });
      editor.focus();
    }
  },
  replayRequestReplace: (caido: any, { text }: { text: string }) => {
    const { requestEditor } = getCurrentReplayEditors();
    if (requestEditor) {
      requestEditor.dispatch({
        changes: {from: 0, to: requestEditor.state.doc.length, insert: text}
      });
      requestEditor.focus();
    }
  },
  //DEPRECATED
  replayReplaceByString: (caido: any, { match, replace }: { match: string, replace: string }) => {
    const { requestEditor } = getCurrentReplayEditors();
    if (requestEditor) {
      logger.log("replayReplaceByString", { match, replace });
      logger.log("requestEditor", requestEditor);
      const currentText = requestEditor.state.doc.toJSON().join("\r\n");
      const newText = currentText.replace(match, replace);
      requestEditor.dispatch({
        changes: {from: 0, to: requestEditor.state.doc.length, insert: newText}
      });
      requestEditor.focus();
    }
  },
  //DEPRECATED
  replayRequestReplaceSelection: (caido: any, { text }: { text: string }) => {
    const { requestEditor } = getCurrentReplayEditors();
    if (requestEditor) {
      requestEditor.dispatch(
        requestEditor.state.replaceSelection(text)
      );
      requestEditor.focus();
    }
  },
  httpqlBarSetQuery: (caido: any, { text }: { text: string }) => {
    caido.httpHistory.setQuery(text)
  },
  searchBarSetQuery: (caido: any, { text }: { text: string }) => {
    caido.search.setQuery(text)
  },
  navigateToSidebarTab: (caido: any, { tabName }: { tabName: string }) => {
    navigateToSidebarTab(tabName);
  },
  renameReplayTab: async (caido: any, { newName, sessionId }: { newName: string, sessionId?: string }) => {
    return await caido.replay.renameSession(sessionId || getCurrentlySelectedReplayTabSessionId(), newName);
  },
  sendReplayTab: (caido: any) => {
    sendCurrentReplayTab();
  },
  addMatchAndReplace: async (caido: any, matchAndReplaceObject: {
    name: string,
    matchTerm: string,
    replaceTerm: string,
    isRegex: boolean,
    query: string,
    strategy?: string,
    isEnabled?: boolean,
    collectionId?: string
  }) => {
    logger.log("matchAndReplaceObject", matchAndReplaceObject);
    matchAndReplaceObject.isEnabled = matchAndReplaceObject.isEnabled || true;
    matchAndReplaceObject.collectionId = matchAndReplaceObject.collectionId || "1";
    matchAndReplaceObject.strategy = matchAndReplaceObject.strategy || "RESPONSE_BODY";
    return await caido.matchReplace.createRule(matchAndReplaceObject);
  },
  addScope: async (caido: any, { name, allowlist, denylist }: { name: string, allowlist: string[], denylist?: string[] }) => {
    denylist = denylist || [];
    logger.log("scopeObject", { name, allowlist, denylist });
    return await caido.scopes.createScope({ name, allowlist, denylist });
  },
  deleteScope: async (caido: any, { name, id }: { name?: string; id?: string }) => {
    let scopeId: string;
    if (name && !id) {
      const scopes = await caido.scopes.getScopes();
      const scopeToDelete = scopes.find((scope: any) => scope.name === name);
      if (scopeToDelete) {
        scopeId = scopeToDelete.id;
      } else {
        throw new Error(`Scope with name "${name}" not found.`);
      }
    } else if (id) {
      scopeId = id;
    } else {
      throw new Error("Either name or id must be provided to delete a scope.");
    }
    
    return await caido.scopes.deleteScope(scopeId);
  },
  updateScope: async (caido: any, { name, allowList, denyList }: { name: string, allowList: string[], denyList: string[] }) => {
    let currentScope = getCurrentScope();
    let scopes = await caido.scopes.getScopes();
    currentScope = scopes.find((s: any) => s.name === currentScope);
    if (currentScope) {
      return await caido.scopes.updateScope(currentScope.id, { name, allowList, denyList });
    } else {
      throw new Error("Current scope not found.");
    }
  },
  addFilter: async (caido: any, { name, query, alias }: { name: string; query: string; alias: string }) => {
    try {
      const newFilter = await caido.filters.create({ name, query, alias });
      logger.log("Filter created successfully:", newFilter);
      return newFilter;
    } catch (error) {
      logger.error("Error creating filter:", error);
      throw error;
    }
  },
  updateFilter: async (caido: any, { id, name, alias, query }: { id: string, name: string; alias: string; query: string }) => {
    try {
      const updatedFilter = await caido.filters.update(id, { name, alias, query });
      logger.log("Filter updated successfully:", updatedFilter);
      return updatedFilter;
    } catch (error) {
      logger.error("Error updating filter:", error);
      throw error;
    }
  },
  deleteFilter: async (caido: any, { name, id }: { name?: string; id?: string }) => {
    try {
      let filterId: string;
      if (name) {
        const filters = await caido.filters.getAll();
        const filter = filters.find((f: { name: string; id: string }) => f.name === name);
        if (!filter) {
          throw new Error(`Filter with name "${name}" not found.`);
        }
        filterId = filter.id;
      } else if (id) {
        filterId = id;
      } else {
        throw new Error("Either name or id must be provided to delete a filter.");
      }
      logger.log("Filter deleted successfully");
      return await caido.filters.delete(filterId);
    } catch (error) {
      logger.error("Error deleting filter:", error);
      throw error;
    }
  },
  showConfirmationModal: async (caido: any, { title, message, onApproveInput, onDenyInput }: { title: string, message: string, onApproveInput?: () => Promise<void>, onDenyInput?: () => Promise<void> }) => {
    return new Promise((resolve) => {
      const modalComponent = ref(null);

      const modalProps = {
        title,
        message,
        caido,
        onApprove: async (value: any) => {
          modalComponent.value = null;
          if (onApproveInput) {
            await onApproveInput(value);
          }
          resolve(true);
        },
        onDeny: async (value: any) => {
          modalComponent.value = null;
          if (onDenyInput) {
            await onDenyInput(value);
          }
          resolve(false);
        },
      };

      const container = document.createElement('div');
      container.id = "plugin--shift";
      document.body.appendChild(container);
      const app = createApp(ConfirmationModal, modalProps);
      app.mount(container);
      modalComponent.value = { app, container };
    });
  },
  createHostedFile: async (caido: any, { name, content }: { name: string, content: string }) => {
    await actionFunctions.showConfirmationModal(caido, { title: `${name}`, message: content, onApproveInput: async (value: any) => {
      return await caido.files.create(new File([value], name));
    } });
  },
  removeHostedFile: async (caido: any, { id, name }: { id?: string, name?: string }) => {
    try {
      let fileId: string;
      if (id) {
        fileId = id;
      } else if (name) {
        const files = await caido.files.getAll();
        const fileToDelete = files.find((file: any) => file.name === name);
        if (!fileToDelete) {
          throw new Error(`File with name "${name}" not found.`);
        }
        fileId = fileToDelete.id;
      } else {
        throw new Error("Either id or name must be provided to delete a hosted file.");
      }

      logger.log(`Hosted file with ID ${fileId} deleted successfully.`);
      return await caido.files.delete(fileId);
    } catch (error) {
      logger.error("Error deleting hosted file:", error);
      throw error;
    }
  },
  createReplaySession: async (caido: any, { requestSource, collectionId = "1", host, port, isTls = true, name }: { requestSource: string, collectionId?: string, host: string, port: number, isTls: boolean, name?: string }) => {
    try {
      const result = await caido.graphql.createReplaySession({
        input: {
          requestSource: {
            raw: {
              raw: requestSource,
              connectionInfo: {
                host: host,
                port: port,
                isTLS: isTls
              }
            }
          }
        }
      });
      logger.log("Replay session created successfully:", result);
      await caido.replay.openTab(result.createReplaySession.session.id);

      if (name) {
        const sessionId = result.createReplaySession.session.id;
        await caido.graphql.renameReplaySession({
          id: sessionId,
          name: name,
        });
      }
      return result;
    } catch (error) {
      logger.error("Error creating replay session:", error);
      throw error;
    }
  },
  runConvertWorkflow: async (caido: any, { id, input }: { id: string, input: string }) => {
    try {
      const result = await caido.graphql.runConvertWorkflow({
        id: id,
        input: input
      });
      return {output: result.runConvertWorkflow.output};
    } catch (error) {
      logger.error("Error running convert workflow:", error);
      throw error;
    }
  },
  createAutomateSession: async (caido: any, {
    requestSource,
    host,
    port,
    payloads = [],
    isTls = true,
    strategy = "ALL",
    concurrency = { delay: 0, workers: 10 }
  }: {
    requestSource: string,
    host: string,
    port: number,
    payloads?: any[],
    isTls?: boolean,
    strategy?: string,
    concurrency?: { delay: number, workers: number }
  }) => {
    // For payloads, we have 3 options - an object like this {start: 1, end: 2}
    // an object like this: {id: "1"}
    // or an array like this: ["1", "2", "3"]
    try {
      // Find placeholder positions
      const placeholderPositions = [];
      let pos = 0;
      while (true) {
        const index = requestSource.indexOf('§§§', pos);
        if (index === -1) break;
        placeholderPositions.push(index);
        requestSource = requestSource.replace('§§§', '');
        pos = index;
      }

      // Create initial session
      const result = await caido.graphql.createAutomateSession({
        input: {
          requestSource: {
            raw: {
              raw: requestSource,
              connectionInfo: {
                host,
                port,
                isTLS: isTls
              }
            }
          }
        }
      });

      const session = JSON.parse(JSON.stringify(result.createAutomateSession.session).replace(/"__typename":\s*"[^"]*",?/g, ''));

      // Prepare placeholders array from positions
      const placeholders = [];
      for (let i = 0; i < placeholderPositions.length; i += 2) {
        placeholders.push({
          start: placeholderPositions[i],
          end: placeholderPositions[i + 1]
        });
      }

      // Parse payloads into the correct format
      const formattedPayloads = parsePayloads(payloads);

      // Update session with full configuration
      await caido.graphql.updateAutomateSession({
        id: session.id,
        input: {
          connection: {host:session.connection.host,port:session.connection.port, isTLS: session.connection.isTls},
          raw: session.raw,
          settings: {
            ...session.settings,
            strategy,
            concurrency,
            payloads: formattedPayloads,  // Use the formatted payloads
            placeholders
          }
        }
      });
      await switchToAutomateTab(session.id);

      return result;
    } catch (error) {
      logger.error("Error creating automate session:", error);
      throw error;
    }
  }
};
