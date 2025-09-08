import { createSlice } from "@reduxjs/toolkit";

interface TabState {
  activeTab: string;
  availableTabs: string[];
  autoSwitchTriggered: boolean;
}

export const initialState: TabState = {
  activeTab: "chat", // Default active tab
  availableTabs: ["chat", "browser", "planner", "files", "jupyter"],
  autoSwitchTriggered: false,
};

export const tabSlice = createSlice({
  name: "tab",
  initialState,
  reducers: {
    switchToTab: (state, action) => {
      const targetTab = action.payload;
      if (state.availableTabs.includes(targetTab)) {
        state.activeTab = targetTab;
      }
    },
    
    setAutoSwitchTriggered: (state, action) => {
      state.autoSwitchTriggered = action.payload;
    },

    addAvailableTab: (state, action) => {
      const newTab = action.payload;
      if (!state.availableTabs.includes(newTab)) {
        state.availableTabs.push(newTab);
      }
    },

    removeAvailableTab: (state, action) => {
      const tabToRemove = action.payload;
      state.availableTabs = state.availableTabs.filter(tab => tab !== tabToRemove);
      
      // If the removed tab was active, switch to first available tab
      if (state.activeTab === tabToRemove && state.availableTabs.length > 0) {
        state.activeTab = state.availableTabs[0];
      }
    },

    switchToBrowserTab: (state) => {
      if (state.availableTabs.includes("browser")) {
        state.activeTab = "browser";
        state.autoSwitchTriggered = true;
      }
    },
  },
});

export const {
  switchToTab,
  setAutoSwitchTriggered,
  addAvailableTab,
  removeAvailableTab,
  switchToBrowserTab,
} = tabSlice.actions;

export default tabSlice.reducer;