import React from "react";
import { Menu } from "lucide-react";
import { useInsightAI } from "#/components/insight-ai/context/insight-ai-context";
import { InsightAITabs } from "#/components/insight-ai/tabs/insight-ai-tabs";

interface InsightAIHeaderProps {
  currentPath: string;
  onToggleSidebar: () => void;
}

export function InsightAIHeader({
  currentPath,
  onToggleSidebar,
}: InsightAIHeaderProps) {
  const { tabs } = useInsightAI();

  const getPageTitle = (path: string) => {
    if (path === "/insight_ai") return "Dashboard";
    if (path === "/insight_ai/conversations") return "Conversations";
    if (path.includes("/insight_ai/chat/")) return "Chat";
    return "InsightAI";
  };

  return (
    <header className="insight-ai-header">
      {/* Mobile sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="insight-ai-button ghost md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title (only show if no tabs) */}
      {(!tabs || tabs.length === 0) && (
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-insight-text-primary">
            {getPageTitle(currentPath)}
          </h1>
        </div>
      )}

      {/* Tab system */}
      {tabs && tabs.length > 0 && (
        <div className="flex-1">
          <InsightAITabs />
        </div>
      )}

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Placeholder for additional header actions */}
      </div>
    </header>
  );
}
