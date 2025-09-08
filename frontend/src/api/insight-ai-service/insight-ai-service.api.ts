import { openHands } from "../open-hands-axios";
import OpenHands from "../open-hands";
import type {
  TaskItem,
  TaskDetails,
  CreateTaskRequest,
  CreateTaskResponse,
  GetTasksResponse,
  TaskExecutionRequest,
  TaskExecutionResponse,
  GetTaskLogsRequest,
  GetTaskLogsResponse,
  GetTaskFilesRequest,
  GetTaskFilesResponse,
  DownloadFileRequest,
} from "./insight-ai-service.types";

// 使用现有的 OpenHands conversations API 结构
const CONVERSATIONS_BASE_PATH = "/api/conversations";

export class InsightAIService {
  // Task Management APIs - 使用现有的 conversations API
  static async getTasks(
    page = 1,
    limit = 20,
    status?: string,
    type?: string,
  ): Promise<GetTasksResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (type) params.append("type", type);

    // 获取所有 conversations，显示全部但区分 InsightAI 类型
    console.log("InsightAI: Calling getUserConversations()");
    const conversations = await OpenHands.getUserConversations();
    console.log("InsightAI: Received conversations:", conversations.length);

    // 转换为 TaskItem 格式，显示所有对话但区分类型
    const tasks: TaskItem[] = conversations
      .slice((page - 1) * limit, page * limit)
      .map((conv) => {
        const isInsightAI =
          conv.title?.includes("InsightAI") ||
          conv.title?.includes("Analysis") ||
          conv.title?.includes("Insight");

        return {
          id: conv.conversation_id,
          title: isInsightAI
            ? conv.title || "InsightAI Task"
            : conv.title || "Conversation",
          subtitle: "",
          status:
            conv.status === "STARTING"
              ? "starting"
              : conv.status === "RUNNING"
                ? "running"
                : conv.status === "STOPPED"
                  ? "completed"
                  : "pending",
          startTime: conv.created_at,
          updateTime: conv.last_updated_at,
          type: isInsightAI
            ? ("data_analysis" as const)
            : ("query_processing" as const),
          metadata: {
            processingTime: conv.last_updated_at,
            isInsightAI,
          },
        };
      });

    return {
      tasks,
      total: conversations.length,
      page,
      limit,
    };
  }

  static async getTaskDetails(taskId: string): Promise<TaskDetails> {
    // 使用现有的 getConversation API
    const conversation = await OpenHands.getConversation(taskId);

    if (!conversation) {
      throw new Error("Task not found");
    }

    // 转换为 TaskDetails 格式
    return {
      id: conversation.conversation_id,
      title: conversation.title || "Untitled Analysis",
      description: `Analysis conversation for ${conversation.selected_repository || "data analysis"}`,
      status: (() => {
        if (conversation.status === "STARTING") return "starting";
        if (conversation.status === "RUNNING") return "running";
        if (conversation.status === "STOPPED") return "completed";
        return "pending";
      })(),
      results: [
        {
          type: "text",
          title: "Conversation Status",
          content: `Status: ${conversation.status}\nRepository: ${conversation.selected_repository || "None"}\nBranch: ${conversation.selected_branch || "None"}`,
          description: "Current conversation information",
        },
      ],
      thinkingProcess: [
        {
          id: "init",
          title: "Conversation Initialized",
          content:
            "This is an InsightAI analysis conversation. The thinking process will be populated as the conversation progresses.",
          timestamp: conversation.created_at,
          type: "analysis",
          status: "completed",
        },
      ],
      metadata: {
        startTime: conversation.created_at,
        endTime: conversation.last_updated_at,
        processingTime: conversation.last_updated_at,
      },
    };
  }

  static async createTask(
    taskData: CreateTaskRequest,
  ): Promise<CreateTaskResponse> {
    // 使用现有的 createConversation API 创建 InsightAI 类型的 conversation
    const conversation = await OpenHands.createConversation(
      undefined, // selectedRepository
      undefined, // git_provider
      `InsightAI: ${taskData.title}\n\n${taskData.description}`, // initialUserMsg
      undefined, // suggested_task
      undefined, // selected_branch
      JSON.stringify({
        type: "insight_ai_task",
        taskData,
      }), // conversationInstructions
    );

    return {
      taskId: conversation.conversation_id,
      status: "created",
      message: "InsightAI task created as conversation successfully",
    };
  }

  static async executeTaskAction(
    taskId: string,
    actionData: TaskExecutionRequest,
  ): Promise<TaskExecutionResponse> {
    // 使用现有的 OpenHands API
    if (actionData.action === "start") {
      await OpenHands.startConversation(taskId);
    } else if (actionData.action === "stop") {
      await OpenHands.stopConversation(taskId);
    }
    // TODO: 实现其他动作 (pause, restart)

    return {
      taskId,
      status: "executed",
      message: `Action ${actionData.action} executed successfully`,
    };
  }

  static async deleteTask(taskId: string): Promise<void> {
    // 使用现有的 deleteUserConversation API
    await OpenHands.deleteUserConversation(taskId);
  }

  // Task Logs APIs - 使用现有的事件系统
  static async getTaskLogs(
    params: GetTaskLogsRequest,
  ): Promise<GetTaskLogsResponse> {
    try {
      // 使用现有的 conversation events API
      const response = await openHands.get(
        `${CONVERSATIONS_BASE_PATH}/${params.taskId}/events`,
        {
          params: {
            limit: params.limit || 100,
            since: params.since,
          },
        },
      );

      // 转换事件为日志格式
      const logs = response.data
        .filter(
          (event: Record<string, unknown>) =>
            event.type === "observation" || event.type === "action",
        )
        .map((event: Record<string, unknown>, index: number) => ({
          id: `${params.taskId}-${index}`,
          timestamp: event.timestamp || new Date().toISOString(),
          level: event.type === "error" ? "error" : "info",
          message: event.message || event.content || JSON.stringify(event),
          source: event.source || "system",
        }));

      return {
        logs,
        hasMore: logs.length >= (params.limit || 100),
      };
    } catch (error) {
      // 如果没有事件，返回空的日志列表
      return {
        logs: [],
        hasMore: false,
      };
    }
  }

  // 获取对话历史记录
  static async getConversationHistory(
    conversationId: string,
    params?: {
      limit?: number;
      startId?: number;
      endId?: number;
      reverse?: boolean;
    },
  ): Promise<{
    events: Array<{
      id: string;
      type: "user" | "assistant" | "system";
      content: string;
      timestamp: string;
      source: string;
    }>;
    hasMore: boolean;
  }> {
    try {
      console.log(`Fetching conversation history for: ${conversationId}`);
      console.log("API call with correct OpenHands parameters:", params);

      // 使用正确的OpenHands API参数名称
      const apiParams: Record<string, any> = {};

      if (params?.limit) {
        apiParams.limit = Math.min(params.limit, 100); // 限制最大值为100
      }

      if (params?.startId !== undefined) {
        apiParams.start_id = params.startId; // 注意：使用start_id，不是startId
      }

      if (params?.endId !== undefined) {
        apiParams.end_id = params.endId; // 注意：使用end_id，不是endId
      }

      if (params?.reverse !== undefined) {
        apiParams.reverse = params.reverse;
      }

      console.log("Final API parameters:", apiParams);

      const response = await openHands.get(
        `${CONVERSATIONS_BASE_PATH}/${conversationId}/events`,
        { params: apiParams },
      );

      console.log("Raw events response:", response.data);
      console.log("Response data type:", typeof response.data);
      console.log("Response data keys:", Object.keys(response.data || {}));

      // 处理不同的响应格式
      let rawEvents = [];
      if (Array.isArray(response.data)) {
        // 如果直接返回事件数组
        rawEvents = response.data;
      } else if (response.data.events && Array.isArray(response.data.events)) {
        // 如果包装在 events 字段中
        rawEvents = response.data.events;
      } else {
        console.warn("Unexpected response format:", response.data);
      }
      // 打印前几个原始事件以便调试
      console.log("Sample raw events:", rawEvents.slice(0, 5));

      interface EventData {
        source?: string;
        action?: string;
        message?: string;
        args?: Record<string, unknown>;
        timestamp?: string;
        id?: number;
        observation?: string;
        [key: string]: unknown;
      }

      const events = rawEvents
        .map((event: EventData, index: number) => {
          // 详细打印每个事件的结构以便调试
          if (index < 3) {
            console.log(`Event ${index}:`, {
              action: event.action,
              source: event.source,
              observation: event.observation,
              message: event.message,
              args: event.args,
              id: event.id,
              timestamp: event.timestamp,
            });
          }

          let type: "user" | "assistant" | "system" = "system";
          let content = "";

          // 更宽松的消息识别逻辑 - 处理所有可能的消息类型
          if (event.source === "user") {
            type = "user";
            content =
              event.message || 
              (event.args?.content as string) || 
              (event.args?.message as string) || 
              "";
          } else if (event.source === "agent") {
            type = "assistant";
            if (event.action === "message") {
              content = event.message || (event.args?.content as string) || "";
            } else if (event.action === "finish") {
              content =
                (event.args?.final_thought as string) ||
                (event.args?.thought as string) ||
                event.message ||
                "";
            } else if (
              event.args?.thought &&
              typeof event.args.thought === "string"
            ) {
              content = event.args.thought as string;
            } else if (event.message) {
              content = event.message;
            } else if (event.action && event.args) {
              // 显示action类型和参数
              const actionName = event.action;
              const actionArgs = Object.entries(event.args)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
              content = `执行操作: ${actionName} (${actionArgs})`;
            }
          } else if (
            event.observation === "delegate" ||
            event.observation === "agent_delegate"
          ) {
            type = "assistant";
            content =
              event.message || 
              (event.args?.outputs as string) || 
              (event.args?.content as string) || 
              "";
          } else if (event.args?.content) {
            type = event.source === "user" ? "user" : "assistant";
            content = event.args.content as string;
          } else if (event.message) {
            // 任何有message字段的事件都尝试显示
            type = event.source === "user" ? "user" : "assistant";
            content = event.message;
          }

          return {
            id: event.id?.toString() || `${conversationId}-${index}`,
            type,
            content: content.trim(),
            timestamp: event.timestamp || new Date().toISOString(),
            source: event.source || "system",
          };
        })
        .filter((event: { content: string }) => event.content.length > 0);

      console.log(`Processed ${events.length} conversation events:`, events);

      return {
        events,
        hasMore: response.data.has_more || false,
      };
    } catch (error: any) {
      console.error("Failed to fetch conversation history:", error);

      // 提供更详细的错误信息
      if (error?.response) {
        console.error("API Error Details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.response.config?.url,
          params: error.response.config?.params,
        });
      }

      // 返回空的对话历史，不显示模拟消息
      return {
        events: [],
        hasMore: false,
      };
    }
  }

  // Task Files APIs - 使用现有的文件系统
  static async getTaskFiles(
    params: GetTaskFilesRequest,
  ): Promise<GetTaskFilesResponse> {
    try {
      // 使用现有的文件 API
      const response = await openHands.get(
        `${CONVERSATIONS_BASE_PATH}/${params.taskId}/files`,
        {
          params: {
            path: params.path || "/",
          },
        },
      );

      return {
        files: response.data.files || [],
        currentPath: params.path || "/",
      };
    } catch (error) {
      // 返回空的文件列表
      return {
        files: [],
        currentPath: params.path || "/",
      };
    }
  }

  static async downloadFile(params: DownloadFileRequest): Promise<Blob> {
    try {
      const response = await openHands.get(
        `${CONVERSATIONS_BASE_PATH}/${params.taskId}/files/download`,
        {
          params: { filePath: params.filePath },
          responseType: "blob",
        },
      );

      return response.data;
    } catch (error) {
      // 返回空的文件内容
      return new Blob([""], { type: "text/plain" });
    }
  }

  static async getFileContent(
    taskId: string,
    filePath: string,
  ): Promise<string> {
    try {
      const response = await openHands.get(
        `${CONVERSATIONS_BASE_PATH}/${taskId}/files/content`,
        {
          params: { filePath },
        },
      );

      return response.data.content || response.data;
    } catch (error) {
      // 返回空的文件内容
      return "";
    }
  }

  // Real-time Updates - 使用现有的 WebSocket 连接
  static async subscribeToTaskUpdates(taskId: string): Promise<EventSource> {
    // 使用现有的 conversation WebSocket 连接
    const eventSource = new EventSource(
      `${window.location.protocol}//${window.location.host}${CONVERSATIONS_BASE_PATH}/${taskId}/stream`,
    );

    return eventSource;
  }

  // Data Analysis Specific APIs
  static async createDataAnalysisTask(config: {
    title: string;
    description: string;
    dataSource: {
      type: "file" | "database" | "api";
      config: Record<string, any>;
    };
    analysisType: "statistical" | "ml" | "visualization" | "custom";
    parameters?: Record<string, any>;
  }): Promise<CreateTaskResponse> {
    return this.createTask({
      title: config.title,
      description: config.description,
      type: "data_analysis",
      parameters: {
        analysisType: config.analysisType,
        ...config.parameters,
      },
      dataSource: config.dataSource,
    });
  }

  static async createQueryAnalysisTask(config: {
    title: string;
    description: string;
    dateRange: {
      start: string;
      end: string;
    };
    userSegment?: "new" | "existing" | "all";
    analysisScope?: string[];
  }): Promise<CreateTaskResponse> {
    return this.createTask({
      title: config.title,
      description: config.description,
      type: "query_processing",
      parameters: {
        dateRange: config.dateRange,
        userSegment: config.userSegment || "new",
        analysisScope: config.analysisScope || [],
      },
    });
  }

  // Utility Methods
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // 使用现有的健康检查端点
      const response = await openHands.get("/api/health");

      return {
        status: response.data?.status || "ok",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export individual methods for easier importing
export const {
  getTasks,
  getTaskDetails,
  createTask,
  executeTaskAction,
  deleteTask,
  getTaskLogs,
  getConversationHistory,
  getTaskFiles,
  downloadFile,
  getFileContent,
  subscribeToTaskUpdates,
  createDataAnalysisTask,
  createQueryAnalysisTask,
  healthCheck,
} = InsightAIService;
