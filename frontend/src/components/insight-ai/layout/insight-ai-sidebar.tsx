import React from "react";
import { Link, useLocation } from "react-router";
import { Plus, Menu, Settings, UserCircle } from "lucide-react";
import { useInsightAI } from "#/components/insight-ai/context/insight-ai-context";

interface InsightAISidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function InsightAISidebar({
  collapsed,
  onToggle,
}: InsightAISidebarProps) {
  const location = useLocation();
  const { createTab } = useInsightAI();

  const handleNewChat = () => {
    const tabId = createTab({
      title: "New Chat",
      type: "chat",
    });
    // Navigate to new chat
    // TODO: Implement conversation creation and navigation
  };

  // InsightAI 不需要额外的导航，直接使用对话管理
  const navigationItems: any[] = [];

  return (
    <aside className={`insight-ai-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="insight-ai-sidebar-header">
        <button
          onClick={onToggle}
          className="insight-ai-button ghost"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {!collapsed && (
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-insight-text-primary">
              InsightAI
            </h1>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="insight-ai-sidebar-content insight-ai-scrollbar">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="insight-ai-button primary w-full mb-4"
          title={collapsed ? "New Chat" : undefined}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New Chat</span>}
        </button>

        {/* Navigation */}
        <nav className="space-y-2">
          {(navigationItems || []).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${
                  item.active
                    ? "bg-insight-primary text-white"
                    : "text-insight-text-secondary hover:bg-insight-surface-hover hover:text-insight-text-primary"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Recent Conversations (when not collapsed) */}
        {!collapsed && (
          <div className="mt-6">
            <h3 className="text-xs font-medium text-insight-text-muted uppercase tracking-wide mb-3">
              Recent Conversations
            </h3>
            <div className="space-y-1">
              {/* Placeholder for recent conversations */}
              <div className="px-3 py-2 text-sm text-insight-text-secondary hover:bg-insight-surface-hover hover:text-insight-text-primary rounded-lg cursor-pointer">
                <div className="truncate">Sample Conversation 1</div>
                <div className="text-xs text-insight-text-muted">
                  2 minutes ago
                </div>
              </div>
              <div className="px-3 py-2 text-sm text-insight-text-secondary hover:bg-insight-surface-hover hover:text-insight-text-primary rounded-lg cursor-pointer">
                <div className="truncate">Sample Conversation 2</div>
                <div className="text-xs text-insight-text-muted">
                  1 hour ago
                </div>
              </div>
              <div className="px-3 py-2 text-sm text-insight-text-secondary hover:bg-insight-surface-hover hover:text-insight-text-primary rounded-lg cursor-pointer">
                <div className="truncate">Sample Conversation 3</div>
                <div className="text-xs text-insight-text-muted">Yesterday</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="insight-ai-sidebar-footer">
        <div className="flex flex-col gap-2">
          <Link
            to="/settings"
            className={`
              insight-ai-button ghost w-full
              ${collapsed ? "justify-center" : "justify-start"}
            `}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="w-5 h-5" />
            {!collapsed && <span>Settings</span>}
          </Link>

          <button
            className={`
              insight-ai-button ghost w-full
              ${collapsed ? "justify-center" : "justify-start"}
            `}
            title={collapsed ? "User Profile" : undefined}
          >
            <UserCircle className="w-5 h-5" />
            {!collapsed && <span>Profile</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
