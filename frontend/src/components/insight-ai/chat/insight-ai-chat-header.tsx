import React from "react";
import { MoreVertical, Share, Trash2, Edit } from "lucide-react";

interface InsightAIChatHeaderProps {
  conversationId: string;
}

export function InsightAIChatHeader({
  conversationId,
}: InsightAIChatHeaderProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(`Conversation ${conversationId}`);

  const handleRename = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveTitle = () => {
    setIsEditing(false);
    // TODO: Implement title save API call
  };

  const handleShare = () => {
    setShowMenu(false);
    // TODO: Implement share functionality
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      // TODO: Implement delete functionality
      setShowMenu(false);
    }
  };

  return (
    <div className="insight-ai-header border-b border-insight-border">
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveTitle();
              } else if (e.key === "Escape") {
                setIsEditing(false);
              }
            }}
            className="insight-ai-input bg-transparent border-none p-0 text-lg font-semibold"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-lg font-semibold text-insight-text-primary hover:text-insight-primary transition-colors"
          >
            {title}
          </button>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="insight-ai-button ghost"
          aria-label="Chat options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 z-20 bg-insight-surface border border-insight-border rounded-lg shadow-lg min-w-[160px]">
              <button
                onClick={handleRename}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-text-primary hover:bg-insight-surface-hover"
              >
                <Edit className="w-4 h-4" />
                Rename
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-insight-text-primary hover:bg-insight-surface-hover"
              >
                <Share className="w-4 h-4" />
                Share
              </button>

              <hr className="border-insight-border" />

              <button
                onClick={handleDelete}
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
  );
}
