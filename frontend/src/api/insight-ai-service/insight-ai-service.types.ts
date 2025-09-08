export interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  status: "pending" | "starting" | "running" | "completed" | "error";
  startTime?: string;
  updateTime?: string;
  endTime?: string;
  duration?: string;
  progress?: number;
  type: "data_analysis" | "query_processing" | "report_generation";
  metadata?: {
    dataPoints?: number;
    processingTime?: string;
    userId?: string;
    isInsightAI?: boolean;
  };
}

export interface TaskResult {
  type: "chart" | "table" | "text" | "image";
  title: string;
  content: unknown;
  description?: string;
  dataUrl?: string;
}

export interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: "analysis" | "data_processing" | "insight" | "conclusion";
  status: "completed" | "in_progress" | "pending";
}

export interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: "pending" | "starting" | "running" | "completed" | "error";
  results: TaskResult[];
  thinkingProcess: ThinkingStep[];
  metadata?: {
    startTime?: string;
    endTime?: string;
    dataPoints?: number;
    processingTime?: string;
    userId?: string;
    parameters?: Record<string, unknown>;
  };
  logs?: LogEntry[];
  files?: FileItem[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  source?: string;
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  modified?: string;
  content?: string;
  downloadUrl?: string;
}

// API Request/Response Types
export interface CreateTaskRequest {
  title: string;
  description: string;
  type: "data_analysis" | "query_processing" | "report_generation";
  parameters?: Record<string, unknown>;
  dataSource?: {
    type: "file" | "database" | "api";
    config: Record<string, unknown>;
  };
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
  message?: string;
}

export interface GetTasksResponse {
  tasks: TaskItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetTaskDetailsResponse extends TaskDetails {}

export interface TaskExecutionRequest {
  action: "start" | "pause" | "stop" | "restart";
  parameters?: Record<string, unknown>;
}

export interface TaskExecutionResponse {
  taskId: string;
  status: string;
  message?: string;
}

export interface GetTaskLogsRequest {
  taskId: string;
  level?: "info" | "warning" | "error" | "success";
  since?: string;
  limit?: number;
}

export interface GetTaskLogsResponse {
  logs: LogEntry[];
  hasMore: boolean;
}

export interface GetTaskFilesRequest {
  taskId: string;
  path?: string;
}

export interface GetTaskFilesResponse {
  files: FileItem[];
  currentPath: string;
}

export interface DownloadFileRequest {
  taskId: string;
  filePath: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
