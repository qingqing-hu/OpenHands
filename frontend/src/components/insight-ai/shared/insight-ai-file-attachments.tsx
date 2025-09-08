import React from "react";
import { File, Image } from "lucide-react";

interface FileAttachment {
  url: string;
  name: string;
  type?: string;
}

interface InsightAIFileAttachmentsProps {
  files?: string[];
  images?: string[];
}

export function InsightAIFileAttachments({
  files,
  images,
}: InsightAIFileAttachmentsProps) {
  if (!files?.length && !images?.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Image attachments */}
      {images && images.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-insight-text-secondary">
            Images ({images.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="max-w-48 max-h-32 rounded-lg object-cover border border-insight-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all">
                  <button
                    onClick={() => window.open(imageUrl, "_blank")}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-insight-surface text-insight-text-primary rounded-full p-1 transition-opacity"
                    title="View full size"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File attachments */}
      {files && files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-insight-text-secondary">
            Files ({files.length})
          </div>
          <div className="space-y-1">
            {files.map((fileUrl, index) => {
              const fileName = fileUrl.split("/").pop() || `File ${index + 1}`;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-insight-surface-hover hover:bg-insight-surface-active transition-colors cursor-pointer"
                  onClick={() => window.open(fileUrl, "_blank")}
                >
                  <File className="w-4 h-4 text-insight-text-secondary flex-shrink-0" />
                  <span className="text-sm text-insight-text-primary truncate">
                    {fileName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
