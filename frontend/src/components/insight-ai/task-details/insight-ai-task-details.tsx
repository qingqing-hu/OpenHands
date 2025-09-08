import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  BarChart3,
  FileText,
  Download,
  Copy,
  ExternalLink,
} from "lucide-react";
import { decodeHtmlEntities } from "../shared/html-entity-decoder";

interface TaskResult {
  type: "chart" | "table" | "text" | "image";
  title: string;
  content: any;
  description?: string;
}

interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  type: "analysis" | "data_processing" | "insight" | "conclusion";
  status: "completed" | "in_progress" | "pending";
}

interface TaskDetailsData {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "error";
  results: TaskResult[];
  thinkingProcess: ThinkingStep[];
  metadata?: {
    startTime?: Date;
    endTime?: Date;
    dataPoints?: number;
    processingTime?: string;
  };
}

interface InsightAITaskDetailsProps {
  task: TaskDetailsData | null;
}

const stepTypeConfig = {
  analysis: {
    icon: BarChart3,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
  },
  data_processing: {
    icon: FileText,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800",
  },
  insight: {
    icon: Brain,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-800",
  },
  conclusion: {
    icon: ExternalLink,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-800",
  },
};

export function InsightAITaskDetails({ task }: InsightAITaskDetailsProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Brain className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Select a task
          </h3>
          <p className="text-gray-600">
            Choose a task from the list to view its details and results
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {task.title}
            </h1>
            <p className="text-gray-600 leading-relaxed">{task.description}</p>

            {task.metadata && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                {task.metadata.dataPoints && (
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {task.metadata.dataPoints.toLocaleString()} data points
                  </span>
                )}
                {task.metadata.processingTime && (
                  <span>Processing time: {task.metadata.processingTime}</span>
                )}
                {task.metadata.startTime && (
                  <span>
                    Started: {task.metadata.startTime.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-6">
            <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Analysis Results
        </h2>

        {task.results && task.results.length > 0 ? (
          <div className="space-y-6">
            {task.results.map((result, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {result.title}
                  </h3>
                  {result.description && (
                    <p className="text-sm text-gray-600">
                      {result.description}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                  {result.type === "text" && (
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: decodeHtmlEntities(result.content),
                      }}
                    />
                  )}
                  {result.type === "table" && (
                    <div className="overflow-x-auto">
                      <div className="text-gray-600">
                        Table data would be rendered here
                      </div>
                    </div>
                  )}
                  {result.type === "chart" && (
                    <div className="h-64 flex items-center justify-center bg-white rounded border">
                      <div className="text-gray-500">
                        Chart visualization would be rendered here
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No results available yet</p>
          </div>
        )}
      </div>

      {/* Thinking Process Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div
          className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowThinking(!showThinking)}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Thinking Process
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({task.thinkingProcess?.length || 0} steps)
              </span>
            </h2>
            {showThinking ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {showThinking && (
          <div className="p-6">
            {task.thinkingProcess && task.thinkingProcess.length > 0 ? (
              <div className="space-y-4">
                {task.thinkingProcess.map((step, index) => {
                  const config = stepTypeConfig[step.type];
                  const StepIcon = config.icon;
                  const isExpanded = expandedSteps.has(step.id);

                  return (
                    <div
                      key={step.id}
                      className={`border rounded-xl ${config.borderColor} ${config.bgColor}`}
                    >
                      <div
                        className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleStep(step.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg bg-white border ${config.borderColor}`}
                            >
                              <StepIcon
                                className={`w-4 h-4 ${config.textColor}`}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">
                                  Step {index + 1}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {step.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 mt-1">
                                {step.title}
                              </h4>
                              {!isExpanded && (
                                <p
                                  className="text-sm text-gray-600 mt-1 line-clamp-2"
                                  dangerouslySetInnerHTML={{
                                    __html: decodeHtmlEntities(step.content),
                                  }}
                                />
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 mt-2" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 mt-2" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="ml-12 bg-white rounded-lg p-4 border border-gray-200">
                            <div className="prose prose-sm max-w-none">
                              <div
                                className="whitespace-pre-wrap text-gray-700"
                                dangerouslySetInnerHTML={{
                                  __html: decodeHtmlEntities(step.content),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No thinking steps recorded yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
