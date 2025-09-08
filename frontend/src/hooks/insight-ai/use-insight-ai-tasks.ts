import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InsightAIService } from "#/api/insight-ai-service/insight-ai-service.api";
import type {
  TaskItem,
  TaskDetails,
  CreateTaskRequest,
  TaskExecutionRequest,
} from "#/api/insight-ai-service/insight-ai-service.types";

// Query Keys
export const insightAIKeys = {
  all: ['insight-ai'] as const,
  tasks: () => [...insightAIKeys.all, 'tasks'] as const,
  tasksList: (filters?: { status?: string; type?: string; page?: number; limit?: number }) => 
    [...insightAIKeys.tasks(), 'list', filters] as const,
  taskDetails: (taskId: string) => [...insightAIKeys.tasks(), 'detail', taskId] as const,
  taskLogs: (taskId: string, params?: any) => [...insightAIKeys.tasks(), taskId, 'logs', params] as const,
  taskFiles: (taskId: string, path?: string) => [...insightAIKeys.tasks(), taskId, 'files', path] as const,
  conversationHistory: (conversationId: string, params?: any) => 
    [...insightAIKeys.tasks(), conversationId, 'history', params] as const,
};

// Custom Hooks

export function useInsightAITasks(filters?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: insightAIKeys.tasksList(filters),
    queryFn: () => InsightAIService.getTasks(
      filters?.page,
      filters?.limit,
      filters?.status,
      filters?.type
    ),
    staleTime: 1000 * 60, // 60 seconds - 减少频率
    refetchInterval: false, // 禁用自动刷新，改为手动刷新
    refetchOnWindowFocus: false, // 禁用窗口焦点时自动刷新
  });
}

export function useInsightAITaskDetails(taskId: string, enabled = true) {
  return useQuery({
    queryKey: insightAIKeys.taskDetails(taskId),
    queryFn: () => InsightAIService.getTaskDetails(taskId),
    enabled: !!taskId && enabled,
    staleTime: 1000 * 30, // 30 seconds - 增加缓存时间
    refetchInterval: false, // 禁用自动刷新
    refetchOnWindowFocus: false, // 禁用窗口焦点时自动刷新
  });
}

export function useInsightAITaskLogs(taskId: string, params?: {
  level?: "info" | "warning" | "error" | "success";
  since?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: insightAIKeys.taskLogs(taskId, params),
    queryFn: () => InsightAIService.getTaskLogs({ taskId, ...params }),
    enabled: !!taskId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: false, // 禁用自动刷新，日志可以通过WebSocket实时更新
    refetchOnWindowFocus: false,
  });
}

export function useInsightAITaskFiles(taskId: string, path?: string) {
  return useQuery({
    queryKey: insightAIKeys.taskFiles(taskId, path),
    queryFn: () => InsightAIService.getTaskFiles({ taskId, path }),
    enabled: !!taskId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useInsightAIConversationHistory(conversationId: string, params?: {
  limit?: number;
  startId?: number;
  endId?: number;
  reverse?: boolean;
}) {
  return useQuery({
    queryKey: insightAIKeys.conversationHistory(conversationId, params),
    queryFn: () => InsightAIService.getConversationHistory(conversationId, params),
    enabled: !!conversationId,
    staleTime: 1000 * 60, // 60 seconds - 历史记录通过WebSocket实时更新，不需要频繁拉取
    refetchInterval: false, // 禁用自动刷新，使用WebSocket实时更新
    refetchOnWindowFocus: false,
  });
}

export function useCreateInsightAITask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskData: CreateTaskRequest) => InsightAIService.createTask(taskData),
    onSuccess: () => {
      // Invalidate and refetch tasks list
      queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
    },
  });
}

export function useExecuteTaskAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, actionData }: { taskId: string; actionData: TaskExecutionRequest }) =>
      InsightAIService.executeTaskAction(taskId, actionData),
    onSuccess: (_, { taskId }) => {
      // Invalidate specific task details and tasks list
      queryClient.invalidateQueries({ queryKey: insightAIKeys.taskDetails(taskId) });
      queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
    },
  });
}

export function useDeleteInsightAITask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: string) => InsightAIService.deleteTask(taskId),
    onSuccess: (_, taskId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: insightAIKeys.taskDetails(taskId) });
      queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
    },
  });
}

export function useCreateDataAnalysisTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Parameters<typeof InsightAIService.createDataAnalysisTask>[0]) =>
      InsightAIService.createDataAnalysisTask(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
    },
  });
}

export function useCreateQueryAnalysisTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Parameters<typeof InsightAIService.createQueryAnalysisTask>[0]) =>
      InsightAIService.createQueryAnalysisTask(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
    },
  });
}

// Utility hook for file operations
export function useInsightAIFileOperations(taskId: string) {
  const downloadFile = async (filePath: string) => {
    try {
      const blob = await InsightAIService.downloadFile({ taskId, filePath });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  };

  const getFileContent = (filePath: string) => {
    return InsightAIService.getFileContent(taskId, filePath);
  };

  return {
    downloadFile,
    getFileContent,
  };
}

// Real-time updates hook
export function useInsightAITaskStream(taskId: string, enabled = true) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: [...insightAIKeys.taskDetails(taskId), 'stream'],
    queryFn: async () => {
      if (!enabled || !taskId) {
        return null;
      }

      try {
        const eventSource = await InsightAIService.subscribeToTaskUpdates(taskId);
        
        eventSource.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            
            // Update specific task details in cache
            queryClient.setQueryData(insightAIKeys.taskDetails(taskId), (old: TaskDetails | undefined) => ({
              ...old,
              ...data,
            } as TaskDetails));
            
            // Also update tasks list if status changed
            if (data.status) {
              queryClient.invalidateQueries({ queryKey: insightAIKeys.tasks() });
            }
          } catch (error) {
            console.error('Failed to parse SSE data:', error);
          }
        };
        
        eventSource.onerror = (error: Event) => {
          console.error('SSE connection error:', error);
          eventSource.close();
        };
        
        // Return cleanup function
        return () => eventSource.close();
      } catch (error) {
        console.error('Failed to create EventSource:', error);
        return null;
      }
    },
    enabled: enabled && !!taskId,
    staleTime: Infinity, // Don't refetch, rely on SSE
    refetchOnWindowFocus: false,
  });
}