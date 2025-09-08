import React from "react";
import { useInsightAI } from "#/components/insight-ai/context/insight-ai-context";
import { MessageSquare, Terminal, Globe, FileText, X } from "lucide-react";

const TAB_ICONS = {
  chat: MessageSquare,
  terminal: Terminal,
  browser: Globe,
  files: FileText,
};

export function InsightAITabs() {
  const { tabs, activeTabId, switchTab, closeTab } = useInsightAI();

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className="insight-ai-tabs insight-ai-scrollbar">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.type];
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`insight-ai-tab ${isActive ? "active" : ""}`}
            onClick={() => switchTab(tab.id)}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tab.title}</span>

            <button
              className="insight-ai-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              aria-label={`Close ${tab.title}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
