import { combineReducers, configureStore } from "@reduxjs/toolkit";
import agentReducer from "./state/agent-slice";
import browserReducer from "./state/browser-slice";
import codeReducer from "./state/code-slice";
import fileStateReducer from "./state/file-state-slice";
import initialQueryReducer from "./state/initial-query-slice";
import commandReducer from "./state/command-slice";
import { jupyterReducer } from "./state/jupyter-slice";
import securityAnalyzerReducer from "./state/security-analyzer-slice";
import statusReducer from "./state/status-slice";
import metricsReducer from "./state/metrics-slice";
import microagentManagementReducer from "./state/microagent-management-slice";
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/frontend/src/store.ts
import tabReducer from "./state/tab-slice";
||||||| /tmp/source-analysis/OpenHands-main/frontend/src/store.ts
import eventMessageReducer from "./state/event-message-slice";
=======
>>>>>>> /tmp/colleague-analysis/colleague-code/frontend/src/store.ts

export const rootReducer = combineReducers({
  fileState: fileStateReducer,
  initialQuery: initialQueryReducer,
  browser: browserReducer,
  code: codeReducer,
  cmd: commandReducer,
  agent: agentReducer,
  jupyter: jupyterReducer,
  securityAnalyzer: securityAnalyzerReducer,
  status: statusReducer,
  metrics: metricsReducer,
  microagentManagement: microagentManagementReducer,
<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/frontend/src/store.ts
  tab: tabReducer,
||||||| /tmp/source-analysis/OpenHands-main/frontend/src/store.ts
  eventMessage: eventMessageReducer,
=======
>>>>>>> /tmp/colleague-analysis/colleague-code/frontend/src/store.ts
});

const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;

export default store;
