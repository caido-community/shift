import { EditorView } from "@codemirror/view"
import { StateEffect, EditorState } from "@codemirror/state"
import { inlineSuggestion } from "codemirror-extension-inline-suggestion";
import logger from './utils/logger';

const fetchSuggestions = async (query: string) => {
  logger.log("Fetching suggestions for query:", query);
  return "test";
}

export async function applyAutocomplete(requestEditor: EditorView) {
  logger.log("Applying autocomplete");
  logger.log(requestEditor);
  
  const newExtensions = [inlineSuggestion({
    fetchFn: fetchSuggestions,
    delay:200
  })];

  requestEditor.dispatch({
    effects: StateEffect.appendConfig.of(newExtensions)
  });

  const simpleViewPlugin = EditorView.updateListener.of((update) => {
    logger.log("View plugin triggered!", update);
  });

  requestEditor.dispatch({
    effects: StateEffect.appendConfig.of([simpleViewPlugin])
  });
    

  // requestEditor.dispatch({
  //   changes: {
  //     from: 0,
  //     to: 5,
  //     insert: Math.random().toString(36).substring(2, 7)
  //   }
  // });

  logger.log("Applied autocomplete", requestEditor);
}