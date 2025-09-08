import { Link } from "react-router";
import { useInsightAI } from "#/components/insight-ai/context/insight-ai-context";
import { MessageSquare, Plus, Clock, BookOpen } from "lucide-react";

export function InsightAIDashboard() {
  const { createTab } = useInsightAI();

  const handleNewChat = () => {
    createTab({
      title: "New Chat",
      type: "chat",
    });
  };

  type ActionVariant = "primary" | "secondary";

  interface QuickAction {
    title: string;
    description: string;
    icon: any;
    variant: ActionVariant;
    onClick?: () => void;
    href?: string;
  }

  const quickActions: QuickAction[] = [
    {
      title: "Start New Chat",
      description: "Begin a new conversation with AI assistant",
      icon: Plus,
      onClick: handleNewChat,
      variant: "primary" as const,
    },
    {
      title: "View Conversations",
      description: "Manage and browse your chat history",
      icon: MessageSquare,
      href: "/insight_ai/conversations",
      variant: "secondary" as const,
    },
    {
      title: "Recent Activity",
      description: "View your recent interactions",
      icon: Clock,
      onClick: () => console.log("View recent activity"),
      variant: "secondary" as const,
    },
    {
      title: "Documentation",
      description: "Learn how to use InsightAI effectively",
      icon: BookOpen,
      href: "#",
      variant: "secondary" as const,
    },
  ];

  const recentConversations = [
    {
      id: "1",
      title: "Web Development Best Practices",
      lastMessage: "Thanks for the detailed explanation of React patterns...",
      timestamp: "2 minutes ago",
      messageCount: 12,
    },
    {
      id: "2",
      title: "Database Design Discussion",
      lastMessage: "The normalized schema looks good. Consider adding...",
      timestamp: "1 hour ago",
      messageCount: 8,
    },
    {
      id: "3",
      title: "Machine Learning Project",
      lastMessage: "Here's the Python code for the neural network...",
      timestamp: "Yesterday",
      messageCount: 24,
    },
  ];

  return (
    <div className="p-6 insight-ai-scrollbar h-full overflow-y-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-insight-text-primary mb-2">
          Welcome to InsightAI
        </h1>
        <p className="text-insight-text-secondary">
          Your intelligent assistant for coding, analysis, and creative tasks.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-insight-text-primary mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(quickActions || []).map((action) => {
            const cardClassName = `
              insight-ai-card hover:border-insight-border-light transition-all duration-200
              flex items-start gap-4 p-6 cursor-pointer
              ${
                action.variant === "primary"
                  ? "border-insight-primary bg-insight-primary/5"
                  : ""
              }
            `;

            if (action.href) {
              return (
                <Link
                  key={action.title}
                  to={action.href}
                  className={cardClassName}
                >
                  <div
                    className={
                      action.variant === "primary"
                        ? "p-3 rounded-lg flex-shrink-0 bg-insight-primary text-white"
                        : "p-3 rounded-lg flex-shrink-0 bg-insight-surface-hover text-insight-text-secondary"
                    }
                  >
                    <action.icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <h3
                      className={
                        action.variant === "primary"
                          ? "font-semibold mb-1 text-insight-primary"
                          : "font-semibold mb-1 text-insight-text-primary"
                      }
                    >
                      {action.title}
                    </h3>
                    <p className="text-sm text-insight-text-secondary">
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            }

            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className={cardClassName}
              >
                <div
                  className={
                    action.variant === "primary"
                      ? "p-3 rounded-lg flex-shrink-0 bg-insight-primary text-white"
                      : "p-3 rounded-lg flex-shrink-0 bg-insight-surface-hover text-insight-text-secondary"
                  }
                >
                  <action.icon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <h3
                    className={
                      action.variant === "primary"
                        ? "font-semibold mb-1 text-insight-primary"
                        : "font-semibold mb-1 text-insight-text-primary"
                    }
                  >
                    {action.title}
                  </h3>
                  <p className="text-sm text-insight-text-secondary">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-insight-text-primary">
            Recent Conversations
          </h2>
          <Link
            to="/insight_ai/conversations"
            className="text-insight-primary hover:text-insight-primary-light text-sm font-medium"
          >
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {(recentConversations || []).map((conversation) => (
            <Link
              key={conversation.id}
              to={`/insight_ai/chat/${conversation.id}`}
              className="insight-ai-card hover:border-insight-border-light transition-all duration-200 block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-insight-text-primary mb-1 truncate">
                    {conversation.title}
                  </h3>
                  <p className="text-sm text-insight-text-secondary mb-2 line-clamp-2">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-insight-text-muted">
                    <span>{conversation.timestamp}</span>
                    <span>{conversation.messageCount} messages</span>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  <MessageSquare className="w-5 h-5 text-insight-text-muted" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Statistics or Tips Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="insight-ai-card text-center">
          <div className="text-2xl font-bold text-insight-primary mb-1">24</div>
          <div className="text-sm text-insight-text-secondary">
            Total Conversations
          </div>
        </div>

        <div className="insight-ai-card text-center">
          <div className="text-2xl font-bold text-insight-success mb-1">
            156
          </div>
          <div className="text-sm text-insight-text-secondary">
            Messages Sent
          </div>
        </div>

        <div className="insight-ai-card text-center">
          <div className="text-2xl font-bold text-insight-info mb-1">12h</div>
          <div className="text-sm text-insight-text-secondary">Time Saved</div>
        </div>
      </div>
    </div>
  );
}
