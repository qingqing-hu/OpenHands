import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Square,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  title: string;
  subtitle: string;
  status: "pending" | "starting" | "running" | "completed" | "error";
  startTime?: Date;
  updateTime?: Date;
  duration?: string;
  progress?: number;
  metadata?: {
    dataPoints?: number;
    processingTime?: string;
    userId?: string;
    isInsightAI?: boolean;
  };
}

interface InsightAITaskListProps {
  tasks: Task[];
  selectedTaskId?: string;
  onTaskSelect: (taskId: string) => void;
  onEditTitle?: (taskId: string, newTitle: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onStopTask?: (taskId: string) => void;
  onStartTask?: (taskId: string) => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    label: "待开始",
  },
  starting: {
    icon: Clock,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    label: "启动中",
  },
  running: {
    icon: Play,
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    label: "运行中",
  },
  completed: {
    icon: CheckCircle,
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    label: "已停止",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    label: "错误",
  },
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffInMinutes = diff / (1000 * 60);
  const diffInHours = diff / (1000 * 60 * 60);
  const diffInDays = diff / (1000 * 60 * 60 * 24);

  if (diffInMinutes < 1) return "刚刚";
  if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}分钟前`;
  if (diffInHours < 24) return `${Math.floor(diffInHours)}小时前`;
  return `${Math.floor(diffInDays)}天前`;
};

export function InsightAITaskList({
  tasks,
  selectedTaskId,
  onTaskSelect,
  onEditTitle,
  onDeleteTask,
  onStopTask,
  onStartTask,
}: InsightAITaskListProps) {
  const { t } = useTranslation();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [stopConfirmId, setStopConfirmId] = useState<string | null>(null);
  const [startConfirmId, setStartConfirmId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setShowMenu(null);
  };

  const handleEditSave = (taskId: string) => {
    if (onEditTitle && editTitle.trim()) {
      onEditTitle(taskId, editTitle.trim());
    }
    setEditingTaskId(null);
    setEditTitle("");
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
    setEditTitle("");
  };

  const handleDeleteClick = (taskId: string) => {
    setDeleteConfirmId(taskId);
  };

  const handleDeleteConfirm = (taskId: string) => {
    if (onDeleteTask) {
      onDeleteTask(taskId);
    }
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleStopClick = (taskId: string) => {
    setStopConfirmId(taskId);
  };

  const handleStopConfirm = (taskId: string) => {
    if (onStopTask) {
      onStopTask(taskId);
    }
    setStopConfirmId(null);
  };

  const handleStopCancel = () => {
    setStopConfirmId(null);
  };

  const handleStartClick = (taskId: string) => {
    setStartConfirmId(taskId);
  };

  const handleStartConfirm = (taskId: string) => {
    if (onStartTask) {
      onStartTask(taskId);
    }
    setStartConfirmId(null);
  };

  const handleStartCancel = () => {
    setStartConfirmId(null);
  };

  const handleMenuToggle = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(showMenu === taskId ? null : taskId);
  };

  const handleMenuAction = (action: string, taskId: string) => {
    setShowMenu(null);
    switch (action) {
      case "edit":
        const task = tasks.find((t) => t.id === taskId);
        if (task) handleEditStart(task);
        break;
      case "delete":
        handleDeleteClick(taskId);
        break;
      case "start":
        handleStartClick(taskId);
        break;
      case "stop":
        handleStopClick(taskId);
        break;
    }
  };

  return (
    <div className="space-y-3">
      {(tasks || []).map((task) => {
        const config = statusConfig[task.status];
        const StatusIcon = config.icon;
        const isSelected = task.id === selectedTaskId;

        return (
          <div
            key={task.id}
            onClick={() => {
              // Only select the task, don't auto-start for stopped tasks
              onTaskSelect(task.id);
            }}
            className={`
              bg-white rounded-xl border transition-all duration-200 cursor-pointer relative group
              ${
                isSelected
                  ? "border-blue-200 shadow-lg ring-2 ring-blue-100"
                  : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
              }
            `}
          >
            <div className="px-3 py-2">
              {/* Title row with edit/delete icons */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(task.id);
                        if (e.key === "Escape") handleEditCancel();
                      }}
                      onBlur={() => handleEditSave(task.id)}
                      className="w-full text-sm font-semibold text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <h3
                      className="font-semibold text-gray-900 text-sm truncate cursor-pointer"
                      title={task.title}
                    >
                      {task.title}
                    </h3>
                  )}
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                    {task.subtitle}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center ml-2">
                  {/* Menu button */}
                  <div
                    className="relative"
                    ref={showMenu === task.id ? menuRef : null}
                  >
                    <button
                      onClick={(e) => handleMenuToggle(task.id, e)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="操作"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>

                    {/* Dropdown menu */}
                    {showMenu === task.id && (
                      <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-md shadow-lg border border-gray-200 py-0.5 z-50">
                        {/* Start button for completed (stopped) tasks */}
                        {task.status === "completed" && (
                          <button
                            onClick={() => handleMenuAction("start", task.id)}
                            className="flex items-center w-full px-2 py-1 text-xs text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            启动对话
                          </button>
                        )}

                        {/* Stop button for running or starting tasks */}
                        {(task.status === "running" ||
                          task.status === "starting") && (
                          <button
                            onClick={() => handleMenuAction("stop", task.id)}
                            className="flex items-center w-full px-2 py-1 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            停止对话
                          </button>
                        )}

                        <button
                          onClick={() => handleMenuAction("edit", task.id)}
                          className="flex items-center w-full px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          修改标题
                        </button>

                        <button
                          onClick={() => handleMenuAction("delete", task.id)}
                          className="flex items-center w-full px-2 py-1 text-xs text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          删除对话
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar for running tasks */}
              {task.status === "running" && task.progress !== undefined && (
                <div className="mb-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Creation time and status row */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  {task.startTime && (
                    <span>创建于 {formatTimeAgo(task.startTime)}</span>
                  )}
                </div>

                {/* Status display for all types */}
                <div className="flex items-center">
                  <div
                    className={`
                    inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                    ${config.bgColor} ${config.textColor}
                  `}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {(!tasks || tasks.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No conversations yet
          </h3>
          <p className="text-gray-500 text-sm">
            Start a new analysis to see conversations here
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="relative">
          {/* Backdrop overlay with 50% opacity */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={handleDeleteCancel}
          />

          {/* Centered dialog box */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    删除对话
                  </h3>
                  <p className="text-sm text-gray-600">
                    确定要删除这个对话吗？此操作不可撤销。
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteConfirm(deleteConfirmId)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation Dialog */}
      {stopConfirmId && (
        <div className="relative">
          {/* Backdrop overlay with 50% opacity */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={handleStopCancel}
          />

          {/* Centered dialog box */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Square className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    停止对话
                  </h3>
                  <p className="text-sm text-gray-600">
                    确定要停止这个正在运行的对话吗？
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleStopCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleStopConfirm(stopConfirmId)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                >
                  停止
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Confirmation Dialog */}
      {startConfirmId && (
        <div className="relative">
          {/* Backdrop overlay with 50% opacity */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={handleStartCancel}
          />

          {/* Centered dialog box */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    启动对话
                  </h3>
                  <p className="text-sm text-gray-600">
                    确定要启动这个已停止的对话吗？
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleStartCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleStartConfirm(startConfirmId)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  启动
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
