import React from "react";
import { Check, X, Clock } from "lucide-react";

export type InsightAIStatusType = "success" | "error" | "timeout" | "pending" | "rejected" | "awaiting";

interface InsightAIStatusIndicatorProps {
  status: InsightAIStatusType;
  className?: string;
}

export function InsightAIStatusIndicator({
  status,
  className = "",
}: InsightAIStatusIndicatorProps) {
  const statusConfig = {
    success: {
      icon: Check,
      className: "text-green-500 bg-green-100 dark:bg-green-900/30",
      title: "工具调用成功",
    },
    error: {
      icon: X,
      className: "text-red-500 bg-red-100 dark:bg-red-900/30",
      title: "工具调用失败",
    },
    timeout: {
      icon: Clock,
      className: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30",
      title: "Timeout",
    },
    pending: {
      icon: Clock,
      className:
        "text-insight-text-secondary bg-insight-surface-hover animate-pulse",
      title: "Pending",
    },
    rejected: {
      icon: X,
      className: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
      title: "用户拒绝执行",
    },
    awaiting: {
      icon: Clock,
      className: "text-gray-500 bg-gray-100 dark:bg-gray-900/30",
      title: "等待用户确认（未完成）",
    },
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full 
        ${config.className} ${className}
      `}
      title={config.title}
    >
      <IconComponent className="w-3 h-3" />
    </div>
  );
}
