import { createSlice } from "@reduxjs/toolkit";

interface BrowserState {
  // Replace screenshotSrc with new iframe-based fields
  currentUrl: string;
  isLoading: boolean;
  error?: string;
  history: string[];
  historyIndex: number;
  
  // New fields for iframe browser functionality
  autoSwitchEnabled: boolean;
  downloadInProgress: boolean;
}

export const initialState: BrowserState = {
  currentUrl: "https://github.com/All-Hands-AI/OpenHands",
  isLoading: false,
  error: undefined,
  history: ["https://github.com/All-Hands-AI/OpenHands"],
  historyIndex: 0,
  autoSwitchEnabled: true,
  downloadInProgress: false,
};

export const browserSlice = createSlice({
  name: "browser",
  initialState,
  reducers: {
    navigateToUrl: (state, action) => {
      state.currentUrl = action.payload;
      state.error = undefined;
      
      // Update history if this is a new URL
      if (state.history[state.historyIndex] !== action.payload) {
        // Remove any forward history when navigating to a new URL
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(action.payload);
        state.historyIndex = state.history.length - 1;
      }
    },
    
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    addToHistory: (state, action) => {
      if (state.history[state.historyIndex] !== action.payload) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(action.payload);
        state.historyIndex = state.history.length - 1;
        state.currentUrl = action.payload;
      }
    },
    
    goBack: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        state.currentUrl = state.history[state.historyIndex];
        state.error = undefined;
      }
    },
    
    goForward: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        state.currentUrl = state.history[state.historyIndex];
        state.error = undefined;
      }
    },
    
    refresh: (state) => {
      state.error = undefined;
    },
    
    downloadPage: (state) => {
      state.downloadInProgress = true;
    },
    
    setDownloadComplete: (state) => {
      state.downloadInProgress = false;
    },
    
    setAutoSwitchEnabled: (state, action) => {
      state.autoSwitchEnabled = action.payload;
    },

    // Legacy action for backward compatibility - maps to navigateToUrl
    setUrl: (state, action) => {
      state.currentUrl = action.payload;
    },
  },
});

export const {
  navigateToUrl,
  setLoading,
  setError,
  addToHistory,
  goBack,
  goForward,
  refresh,
  downloadPage,
  setDownloadComplete,
  setAutoSwitchEnabled,
  setUrl, // Legacy compatibility
} = browserSlice.actions;

export default browserSlice.reducer;
