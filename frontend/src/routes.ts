import {
  type RouteConfig,
  layout,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/root-layout.tsx", [
    index("routes/home.tsx"),
    route("accept-tos", "routes/accept-tos.tsx"),
    route("settings", "routes/settings.tsx", [
      index("routes/llm-settings.tsx"),
      route("mcp", "routes/mcp-settings.tsx"),
      route("user", "routes/user-settings.tsx"),
      route("integrations", "routes/git-settings.tsx"),
      route("app", "routes/app-settings.tsx"),
      route("billing", "routes/billing.tsx"),
      route("secrets", "routes/secrets-settings.tsx"),
      route("api-keys", "routes/api-keys.tsx"),
    ]),
    route("conversations/:conversationId", "routes/conversation.tsx", [
      index("routes/changes-tab.tsx"),
      route("browser", "routes/browser-tab.tsx"),
      route("jupyter", "routes/jupyter-tab.tsx"),
      route("served", "routes/served-tab.tsx"),
      route("terminal", "routes/terminal-tab.tsx"),
      route("vscode", "routes/vscode-tab.tsx"),
    ]),
    route("microagent-management", "routes/microagent-management.tsx"),
  ]),

  // InsightAI routes
  layout("routes/insight-ai-layout.tsx", [
    route("insight_ai", "routes/insight-ai/index.tsx"),
    route("insight_ai/conversations", "routes/insight-ai/conversations.tsx"),
    route(
      "insight_ai/chat/:conversationId",
      "routes/insight-ai/chat.$conversationId.tsx",
    ),
  ]),
] satisfies RouteConfig;
