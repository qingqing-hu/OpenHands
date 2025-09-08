import React from "react";

interface Tab {
  id: string;
  title: string;
  type: "chat" | "terminal" | "browser" | "files";
  active: boolean;
  conversationId?: string;
}

interface InsightAIContextType {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Tab system
  tabs: Tab[];
  activeTabId: string | null;
  createTab: (tab: Omit<Tab, "id" | "active">) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;

  // Conversations
  conversations: any[];
  currentConversation: any | null;
  setCurrentConversation: (conversation: any) => void;

  // UI state
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const InsightAIContext = React.createContext<InsightAIContextType | null>(null);

export function InsightAIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [tabs, setTabs] = React.useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = React.useState<
    any | null
  >(null);
  const [loading, setLoading] = React.useState(false);

  const createTab = React.useCallback((tabData: Omit<Tab, "id" | "active">) => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTab: Tab = {
      ...tabData,
      id,
      active: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);

    // Update existing tabs to inactive
    setTabs((prev) => prev.map((tab) => ({ ...tab, active: tab.id === id })));

    return id;
  }, []);

  const closeTab = React.useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const updatedTabs = prev.filter((tab) => tab.id !== tabId);

        // If closing active tab, switch to the last remaining tab
        if (activeTabId === tabId && updatedTabs.length > 0) {
          const lastTab =
            updatedTabs[Math.max(0, (updatedTabs || []).length - 1)];
          setActiveTabId(lastTab.id);
          return updatedTabs.map((tab) => ({
            ...tab,
            active: tab.id === lastTab.id,
          }));
        }

        if (updatedTabs.length === 0) {
          setActiveTabId(null);
        }

        return updatedTabs;
      });
    },
    [activeTabId],
  );

  const switchTab = React.useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => ({ ...tab, active: tab.id === tabId })),
    );
    setActiveTabId(tabId);
  }, []);

  const updateTab = React.useCallback(
    (tabId: string, updates: Partial<Tab>) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
      );
    },
    [],
  );

  const value: InsightAIContextType = {
    sidebarCollapsed,
    setSidebarCollapsed,
    tabs,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    updateTab,
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    setLoading,
  };

  return (
    <InsightAIContext.Provider value={value}>
      {children}
    </InsightAIContext.Provider>
  );
}

export function useInsightAI() {
  const context = React.useContext(InsightAIContext);
  if (!context) {
    throw new Error("useInsightAI must be used within an InsightAIProvider");
  }
  return context;
}
