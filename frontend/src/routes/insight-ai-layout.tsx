import React, { useState } from "react";
import {
  BiMessageRoundedAdd,
  BiRightIndent,
  BiLeftIndent,
  BiRefresh,
} from "react-icons/bi";
import { MdDragIndicator } from "react-icons/md";
import { LuPanelLeft, LuPanelRight } from "react-icons/lu";
import { useQueryClient } from "@tanstack/react-query";
import { InsightAIProvider } from "#/components/insight-ai/context/insight-ai-context";
import { InsightAITaskList } from "#/components/insight-ai/task-list/insight-ai-task-list";
import { InsightAIConversation } from "#/components/insight-ai/chat/insight-ai-conversation";
import { InsightAICodePanel } from "#/components/insight-ai/code-panel/insight-ai-code-panel";
import {
  useInsightAITasks,
  useCreateInsightAITask,
  useDeleteInsightAITask,
} from "#/hooks/insight-ai/use-insight-ai-tasks";
import { InsightAIService } from "#/api/insight-ai-service/insight-ai-service.api";
import OpenHands from "#/api/open-hands";
import "#/styles/insight-ai-theme.css";

export default function InsightAILayout() {
  // ===== 所有的 React Hooks 必须在组件顶层无条件调用 =====

  // State hooks - 确保永远在顶层调用
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    // Calculate initial width: middle panel 3/5, right panel 2/5
    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 1440;
    const sidebarWidth = 288; // w-72 (expanded)
    const availableWidth = windowWidth - sidebarWidth;
    return Math.floor((availableWidth * 2) / 5); // Right panel gets 2/5 of available width
  });
  const [isResizing, setIsResizing] = useState(false);
  const [middlePanelExpanded, setMiddlePanelExpanded] = useState(false);
  const [savedRightPanelWidth, setSavedRightPanelWidth] = useState(0);
  const [startingTaskIds, setStartingTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [stoppingTaskIds, setStoppingTaskIds] = useState<Set<string>>(
    new Set(),
  );

  // Custom hooks - 确保永远在顶层调用
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useInsightAITasks();

  const createTaskMutation = useCreateInsightAITask();
  const deleteTaskMutation = useDeleteInsightAITask();
  const queryClient = useQueryClient();

  // 添加页面焦点监听，用于跨前端状态同步
  React.useEffect(() => {
    const handleFocus = () => {
      // 当页面重新获得焦点时，刷新任务列表以同步状态
      refetchTasks();

      // 同时刷新当前选中对话的详细数据
      if (selectedTaskId) {
        queryClient.invalidateQueries({
          queryKey: ["user", "conversation", selectedTaskId],
        });
      }
    };

    const handleVisibilityChange = () => {
      // 当页面变为可见时，刷新任务列表
      if (!document.hidden) {
        refetchTasks();

        // 同时刷新当前选中对话的详细数据
        if (selectedTaskId) {
          queryClient.invalidateQueries({
            queryKey: ["user", "conversation", selectedTaskId],
          });
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetchTasks, selectedTaskId, queryClient]);

  // 添加对原生OpenHands查询的监听，实现跨前端状态同步
  React.useEffect(() => {
    const handleQueryUpdate = (event: CustomEvent) => {
      // 当原生前端更新对话状态时，刷新InsightAI任务列表
      if (
        event.detail?.queryKey &&
        (event.detail.queryKey.includes("conversations") ||
          event.detail.queryKey.includes("conversation"))
      ) {
        refetchTasks();

        // 同时刷新当前选中对话的详细数据
        if (selectedTaskId) {
          queryClient.invalidateQueries({
            queryKey: ["user", "conversation", selectedTaskId],
          });
        }
      }
    };

    // 监听查询更新事件（如果有的话）
    // 注意：这个事件可能不存在，需要根据实际情况调整
    window.addEventListener("tanstack-query-update" as any, handleQueryUpdate);

    // 定期轮询作为后备方案，但频率要低
    const pollInterval = setInterval(() => {
      refetchTasks();

      // 同时刷新当前选中对话的详细数据
      if (selectedTaskId) {
        queryClient.invalidateQueries({
          queryKey: ["user", "conversation", selectedTaskId],
        });
      }
    }, 30000); // 30秒轮询一次

    return () => {
      window.removeEventListener(
        "tanstack-query-update" as any,
        handleQueryUpdate,
      );
      clearInterval(pollInterval);
    };
  }, [refetchTasks, selectedTaskId, queryClient]);

  // useMemo hooks - 确保永远在顶层调用
  const tasks = React.useMemo(() => {
    if (!tasksData?.tasks || !Array.isArray(tasksData.tasks)) {
      return [];
    }
    return tasksData.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.subtitle,
      status: task.status,
      startTime: task.startTime ? new Date(task.startTime) : undefined,
      updateTime: task.updateTime ? new Date(task.updateTime) : undefined,
      duration: task.duration,
      progress: task.progress,
    }));
  }, [tasksData]);

  const conversationTitle = React.useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return undefined;
    return tasks.find((task) => task.id === selectedTaskId)?.title;
  }, [tasks, selectedTaskId]);

  // useEffect hooks - 确保永远在顶层调用
  React.useEffect(() => {
    // Task selection change handling
  }, [selectedTaskId]);

  React.useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    // If selectedTaskId doesn't exist in current tasks, clear it
    if (selectedTaskId && !tasks.find((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(undefined);
    }
  }, [selectedTaskId, tasks]);

  // Recalculate panel widths when sidebar is collapsed/expanded
  React.useEffect(() => {
    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 1440;
    const currentSidebarWidth = sidebarCollapsed ? 40 : 288; // w-10 : w-72
    const availableWidth = windowWidth - currentSidebarWidth;
    const newRightPanelWidth = Math.floor((availableWidth * 2) / 5); // Right panel gets 2/5
    setRightPanelWidth(newRightPanelWidth);
  }, [sidebarCollapsed]);

  // ===== Event handlers - 在所有 hooks 调用之后 =====

  // Handle show create task confirmation
  const handleShowCreateConfirm = () => {
    setShowCreateConfirm(true);
  };

  // Handle create new task
  const handleCreateTask = async () => {
    if (createTaskMutation.isPending) {
      return;
    }

    try {
      const result = await createTaskMutation.mutateAsync({
        title: "新的 InsightAI 分析对话",
        description: "开始一个新的数据分析对话",
        type: "data_analysis",
        parameters: {
          analysisType: "custom",
        },
      });

      // Select the newly created task
      setSelectedTaskId(result.taskId);

      // Refetch tasks to update the list
      refetchTasks();

      // Close confirmation dialog
      setShowCreateConfirm(false);
    } catch (error) {
      setShowCreateConfirm(false);
    }
  };

  // Handle cancel create task
  const handleCreateCancel = () => {
    setShowCreateConfirm(false);
  };

  // Handle edit task title
  const handleEditTitle = async (taskId: string, newTitle: string) => {
    try {
      console.log(
        `[Layout] Updating conversation ${taskId} title to: ${newTitle}`,
      );

      // 调用OpenHands API更新对话标题
      await OpenHands.updateConversation(taskId, { title: newTitle });

      console.log(`[Layout] Successfully updated conversation ${taskId} title`);

      // 刷新任务列表以显示更新后的标题
      refetchTasks();

      // 同时刷新当前选中对话的详细数据
      if (selectedTaskId === taskId) {
        queryClient.invalidateQueries({
          queryKey: ["user", "conversation", taskId],
        });
      }

      return true; // 表示成功
    } catch (error) {
      console.error(
        `[Layout] Failed to update conversation ${taskId} title:`,
        error,
      );
      // TODO: 可以添加错误提示给用户
      return false; // 表示失败
    }
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);

      // If deleted task was selected, select another task or clear selection
      if (selectedTaskId === taskId) {
        const remainingTasks = tasks.filter((task) => task.id !== taskId);
        if (remainingTasks.length > 0) {
          // Select the next task or the first one
          const nextTask = remainingTasks[0];
          setSelectedTaskId(nextTask.id);
        } else {
          setSelectedTaskId(undefined);
        }
      }

      // Refetch tasks to update the list
      refetchTasks();
    } catch (error) {
      // Handle delete error
    }
  };

  // Handle stop task
  const handleStopTask = async (taskId: string) => {
    // Add task to stopping set
    setStoppingTaskIds((prev) => new Set([...prev, taskId]));

    try {
      // Call the stop conversation API
      await InsightAIService.executeTaskAction(taskId, { action: "stop" });

      // Refetch tasks to update the list
      refetchTasks();

      // Also invalidate the specific conversation query to update middle panel
      queryClient.invalidateQueries({
        queryKey: ["user", "conversation", taskId],
      });

      // And invalidate the general conversations list
      queryClient.invalidateQueries({
        queryKey: ["user", "conversations"],
      });
    } catch (error) {
      // Handle stop error
    } finally {
      // Remove task from stopping set
      setStoppingTaskIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Handle start task
  const handleStartTask = async (taskId: string) => {
    // Add task to starting set
    setStartingTaskIds((prev) => new Set([...prev, taskId]));

    try {
      // Call the start conversation API
      await InsightAIService.executeTaskAction(taskId, { action: "start" });

      // Refetch tasks to update the list
      refetchTasks();

      // Also invalidate the specific conversation query to update middle panel
      queryClient.invalidateQueries({
        queryKey: ["user", "conversation", taskId],
      });

      // And invalidate the general conversations list
      queryClient.invalidateQueries({
        queryKey: ["user", "conversations"],
      });
    } catch (error) {
      // Handle start error
    } finally {
      // Remove task from starting set
      setStartingTaskIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Handle middle panel expansion/collapse
  const handleToggleMiddlePanel = () => {
    if (middlePanelExpanded) {
      // Collapse: restore right panel
      setRightPanelWidth(savedRightPanelWidth);
      setMiddlePanelExpanded(false);
    } else {
      // Expand: hide right panel
      setSavedRightPanelWidth(rightPanelWidth);
      setRightPanelWidth(0);
      setMiddlePanelExpanded(true);
    }
  };

  // Handle resize functionality
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const windowWidth = window.innerWidth;
      const sidebarWidth = sidebarCollapsed ? 40 : 288; // w-10 : w-72
      const mouseX = e.clientX;

      // Calculate new right panel width (distance from right edge)
      const newWidth = windowWidth - mouseX;

      // Set constraints: minimum right panel 280px, minimum middle panel 400px
      const remainingWidth = windowWidth - sidebarWidth;
      const minRightWidth = 280;
      const minMiddleWidth = 400;
      const maxRightWidth = remainingWidth - minMiddleWidth;

      const constrainedWidth = Math.max(
        minRightWidth,
        Math.min(maxRightWidth, newWidth),
      );
      setRightPanelWidth(constrainedWidth);
    },
    [isResizing, sidebarCollapsed],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners for resize
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // ===== JSX 渲染 =====
  return (
    <InsightAIProvider>
      <div className="insight-ai-layout bg-white h-screen">
        {/* Header */}
        {/* <InsightAIHeader
          currentPath={location.pathname}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        /> */}

        {/* Three Column Layout */}
        <div className="flex h-full overflow-hidden">
          {/* Left Column - Conversation Management */}
          <div
            className={`bg-gray-50 flex flex-col transition-all duration-500 ease-in-out flex-shrink-0 overflow-hidden ${sidebarCollapsed ? "w-10" : "w-72"}`}
          >
            <div className={`layout-header transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between items-baseline'}`}>
                {!sidebarCollapsed && (
                  <div className="layout-title flex items-center gap-2 overflow-hidden">
                    <div 
                      className="flex items-center gap-2 transition-all duration-500 ease-in-out transform opacity-100 translate-x-0 scale-100"
                    >
                      <h2
                        className="text-xl font-bold text-gray-900 whitespace-nowrap"
                        style={{ lineHeight: "2rem" }}
                      >
                        对话管理
                      </h2>
                      <button
                        onClick={async () => {
                          setIsRefreshing(true);
                          try {
                            await refetchTasks();
                          } finally {
                            // 延迟一点时间让用户看到动画效果
                            setTimeout(() => setIsRefreshing(false), 500);
                          }
                        }}
                        className="hover:bg-gray-200 rounded transition-all duration-300 flex items-center justify-center w-6 h-6 p-0"
                        title="刷新对话列表"
                        disabled={isRefreshing}
                      >
                        <BiRefresh
                          className={`w-4 h-4 text-gray-500 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`hover:bg-gray-200 rounded transition-all duration-300 flex items-center justify-center w-8 h-8 p-0 ${sidebarCollapsed ? '' : 'ml-2'}`}
                  style={sidebarCollapsed ? {} : { marginTop: "0.25rem" }}
                  title={sidebarCollapsed ? "展开对话栏" : "收起对话栏"}
                >
                  <div className="relative w-5 h-5">
                    <BiRightIndent 
                      className={`absolute inset-0 w-5 h-5 text-gray-600 transition-all duration-300 transform ${
                        sidebarCollapsed 
                          ? 'opacity-100 rotate-0 scale-100' 
                          : 'opacity-0 -rotate-180 scale-75'
                      }`} 
                    />
                    <BiLeftIndent 
                      className={`absolute inset-0 w-5 h-5 text-gray-600 transition-all duration-300 transform ${
                        !sidebarCollapsed 
                          ? 'opacity-100 rotate-0 scale-100' 
                          : 'opacity-0 rotate-180 scale-75'
                      }`} 
                    />
                  </div>
                </button>
              </div>
            </div>
            <div 
              className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${
                sidebarCollapsed 
                  ? 'opacity-0 transform scale-95 pointer-events-none' 
                  : 'opacity-100 transform scale-100 py-4 px-1.5'
              } insight-ai-scrollbar`}
            >
                {/* 新增对话按钮 */}
                <div
                  className="layout-add-action flex bg-white rounded-xl border border-gray-200 items-center gap-1 p-4 cursor-pointer hover:border-blue-200 transition-all duration-200 mb-3"
                  onClick={handleShowCreateConfirm}
                >
                  <BiMessageRoundedAdd size={16} className="text-gray-600" />
                  <span className="font-semibold text-gray-900 text-sm">
                    {createTaskMutation.isPending ? "创建中..." : "新增对话"}
                  </span>
                </div>

                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    <span className="ml-2 text-gray-600">
                      Loading conversations...
                    </span>
                  </div>
                ) : tasksError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800">
                      Failed to load conversations: {tasksError.message}
                    </p>
                  </div>
                ) : (
                  <InsightAITaskList
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    onTaskSelect={setSelectedTaskId}
                    onEditTitle={handleEditTitle}
                    onDeleteTask={handleDeleteTask}
                    onStopTask={handleStopTask}
                    onStartTask={handleStartTask}
                    startingTaskIds={startingTaskIds}
                    stoppingTaskIds={stoppingTaskIds}
                  />
                )}
            </div>
          </div>

          {/* Middle Column - Conversation History */}
          <div
            className="flex flex-col flex-1 overflow-hidden"
            style={{
              minWidth: middlePanelExpanded ? "auto" : "400px",
            }}
          >
            <div className="flex-1 overflow-hidden">
              {selectedTaskId ? (
                <InsightAIConversation
                  conversationId={selectedTaskId}
                  conversationTitle={conversationTitle}
                  onTogglePanel={handleToggleMiddlePanel}
                  isPanelExpanded={middlePanelExpanded}
                />
              ) : (
                <div className="flex flex-col h-full bg-gray-50 py-2 px-1.5">
                  <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                    {/* Header - only toggle button */}
                    <div
                      className="bg-white px-6 py-3"
                      style={{ height: "64px" }}
                    >
                      <div className="flex items-center justify-end">
                        <button
                          onClick={handleToggleMiddlePanel}
                          className="flex items-center justify-center w-8 h-8 cursor-pointer rounded-lg hover:bg-black/6 transition-all duration-200"
                          title={
                            middlePanelExpanded ? "收起中间栏" : "展开中间栏"
                          }
                        >
                          {middlePanelExpanded ? (
                            <LuPanelRight className="w-4 h-4 text-gray-500" />
                          ) : (
                            <LuPanelLeft className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <BiMessageRoundedAdd className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          选择一个对话
                        </h3>
                        <p className="text-gray-600">
                          从左侧列表中选择一个对话来查看历史记录
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resize Handle - Hidden when middle panel is expanded */}
          {!middlePanelExpanded && (
            <div
              className="w-0.5 bg-gray-50 hover:bg-gray-300 cursor-col-resize transition-colors duration-200 relative group flex-shrink-0"
              onMouseDown={handleMouseDown}
              title="拖拽调整面板宽度"
            >
              {/* Resize indicator icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent">
                <MdDragIndicator className="w-4 h-4 text-blue-500 rotate-90 bg-transparent" />
              </div>
              {/* Hover area expansion */}
              <div className="absolute -left-1 -right-1 top-0 bottom-0 bg-transparent" />
            </div>
          )}

          {/* Right Column - Code/Output - Hidden when middle panel is expanded */}
          {!middlePanelExpanded && (
            <div
              className="flex flex-col flex-shrink-0 overflow-hidden"
              style={{ width: `${rightPanelWidth}px` }}
            >
              <InsightAICodePanel
                taskId={selectedTaskId}
                isRunning={false}
                onClosePanel={handleToggleMiddlePanel}
              />
            </div>
          )}
        </div>

        {/* Create Task Confirmation Dialog */}
        {showCreateConfirm && (
          <div className="relative">
            {/* Backdrop overlay with 50% opacity */}
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onClick={handleCreateCancel}
            />

            {/* Centered dialog box */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <BiMessageRoundedAdd className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      新增对话
                    </h3>
                    <p className="text-sm text-gray-600">
                      确定要创建一个新的数据分析对话吗？
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCreateCancel}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={createTaskMutation.isPending}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
                  >
                    {createTaskMutation.isPending ? "创建中..." : "确认创建"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </InsightAIProvider>
  );
}
