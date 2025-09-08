import React from "react";
import { Link } from "react-router";
import { useInsightAI } from "#/components/insight-ai/context/insight-ai-context";
import {
  Plus,
  Search,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  Share,
  Calendar,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  isArchived: boolean;
}

export function InsightAIConversationManager() {
  const { createTab } = useInsightAI();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConversations, setSelectedConversations] = React.useState<
    string[]
  >([]);
  const [showArchived, setShowArchived] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  // Mock data - replace with actual API calls
  const [conversations, setConversations] = React.useState<Conversation[]>([
    {
      id: "1",
      title: "Web Development Best Practices",
      lastMessage: "Thanks for the detailed explanation of React patterns...",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      messageCount: 12,
      isArchived: false,
    },
    {
      id: "2",
      title: "Database Design Discussion",
      lastMessage: "The normalized schema looks good. Consider adding...",
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      messageCount: 8,
      isArchived: false,
    },
    {
      id: "3",
      title: "Machine Learning Project",
      lastMessage: "Here's the Python code for the neural network...",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      messageCount: 24,
      isArchived: false,
    },
    {
      id: "4",
      title: "Old Archived Chat",
      lastMessage: "This conversation was archived...",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      messageCount: 5,
      isArchived: true,
    },
  ]);

  const handleNewConversation = () => {
    createTab({
      title: "New Chat",
      type: "chat",
    });
    // TODO: Navigate to new chat or create new conversation
  };

  const handleRename = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, title: newTitle } : conv,
      ),
    );
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      setSelectedConversations((prev) =>
        prev.filter((convId) => convId !== id),
      );
    }
    setActiveMenuId(null);
  };

  const handleArchive = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, isArchived: !conv.isArchived } : conv,
      ),
    );
    setActiveMenuId(null);
  };

  const handleBulkDelete = () => {
    if (
      confirm(`Delete ${selectedConversations?.length || 0} conversations?`)
    ) {
      setConversations((prev) =>
        prev.filter((conv) => !selectedConversations.includes(conv.id)),
      );
      setSelectedConversations([]);
    }
  };

  const filteredConversations = conversations
    .filter((conv) => (showArchived ? conv.isArchived : !conv.isArchived))
    .filter(
      (conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-insight-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-insight-text-primary">
            Conversations
          </h1>
          <button
            onClick={handleNewConversation}
            className="insight-ai-button primary"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-insight-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="insight-ai-input pl-10 w-full"
            />
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`insight-ai-button ${showArchived ? "primary" : "ghost"}`}
          >
            <Calendar className="w-4 h-4" />
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>

        {/* Bulk actions */}
        {selectedConversations && selectedConversations.length > 0 && (
          <div className="mt-4 p-3 bg-insight-surface rounded-lg flex items-center justify-between">
            <span className="text-sm text-insight-text-secondary">
              {selectedConversations?.length || 0} conversation(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="insight-ai-button ghost text-insight-error"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedConversations([])}
                className="insight-ai-button ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto insight-ai-scrollbar">
        {!filteredConversations || filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="w-16 h-16 text-insight-text-muted mb-4" />
            <h3 className="text-lg font-semibold text-insight-text-primary mb-2">
              {searchQuery
                ? "No conversations found"
                : showArchived
                  ? "No archived conversations"
                  : "No conversations yet"}
            </h3>
            <p className="text-insight-text-secondary mb-4">
              {searchQuery
                ? `No conversations match "${searchQuery}"`
                : showArchived
                  ? "You haven't archived any conversations yet."
                  : "Start a new conversation to begin chatting with AI."}
            </p>
            {!searchQuery && !showArchived && (
              <button
                onClick={handleNewConversation}
                className="insight-ai-button primary"
              >
                <Plus className="w-4 h-4" />
                Start New Chat
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {(filteredConversations || []).map((conversation) => (
              <div
                key={conversation.id}
                className={`
                  insight-ai-card hover:border-insight-border-light transition-all duration-200
                  ${selectedConversations.includes(conversation.id) ? "border-insight-primary bg-insight-primary/5" : ""}
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedConversations.includes(conversation.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedConversations((prev) => [
                          ...prev,
                          conversation.id,
                        ]);
                      } else {
                        setSelectedConversations((prev) =>
                          prev.filter((id) => id !== conversation.id),
                        );
                      }
                    }}
                    className="mt-1 w-4 h-4 text-insight-primary bg-insight-surface border-insight-border rounded focus:ring-insight-primary focus:ring-2"
                  />

                  {/* Content */}
                  <Link
                    to={`/insight_ai/chat/${conversation.id}`}
                    className="flex-1 min-w-0 hover:text-inherit"
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
                          <span>{formatTimestamp(conversation.timestamp)}</span>
                          <span>{conversation.messageCount} messages</span>
                          {conversation.isArchived && (
                            <span className="px-2 py-1 bg-insight-surface-hover rounded text-xs">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveMenuId(
                          activeMenuId === conversation.id
                            ? null
                            : conversation.id,
                        );
                      }}
                      className="insight-ai-button ghost"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === conversation.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-insight-surface border border-insight-border rounded-lg shadow-lg min-w-[160px]">
                          <button
                            onClick={() => {
                              const newTitle = prompt(
                                "Enter new title:",
                                conversation.title,
                              );
                              if (newTitle && newTitle !== conversation.title) {
                                handleRename(conversation.id, newTitle);
                              }
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-text-primary hover:bg-insight-surface-hover"
                          >
                            <Edit className="w-4 h-4" />
                            Rename
                          </button>

                          <button
                            onClick={() => handleArchive(conversation.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-text-primary hover:bg-insight-surface-hover"
                          >
                            <Calendar className="w-4 h-4" />
                            {conversation.isArchived ? "Unarchive" : "Archive"}
                          </button>

                          <button
                            onClick={() => {
                              // TODO: Implement share functionality
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-text-primary hover:bg-insight-surface-hover"
                          >
                            <Share className="w-4 h-4" />
                            Share
                          </button>

                          <hr className="border-insight-border" />

                          <button
                            onClick={() => handleDelete(conversation.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-error hover:bg-insight-surface-hover"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
