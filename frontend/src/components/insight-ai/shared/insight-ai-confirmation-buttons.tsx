import React from "react";
import { Check, X } from "lucide-react";
import { AgentState } from "#/types/agent-state";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";

interface InsightAIConfirmationButtonsProps {
  onSend: (event: Record<string, unknown>) => void;
}

export function InsightAIConfirmationButtons({ 
  onSend 
}: InsightAIConfirmationButtonsProps) {

  const handleStateChange = (state: AgentState) => {
    const event = generateAgentStateChangeEvent(state);
    onSend(event);
  };

  return (
    <div
      className="pt-3 px-3 pb-2"
      style={{ minWidth: '360px' }} // 确保提示文字不换行的最小宽度 (180px + 148px + 16px gap + 16px padding)
    >
      <div className="flex justify-between items-start gap-4">
        <p
          className="text-sm text-gray-600 flex-1 leading-relaxed whitespace-nowrap"
          style={{
            minWidth: '180px', // 确保提示文字有足够空间不换行
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          智能体正在等待您的确认，是否继续执行此操作？
        </p>
        <div
          className="flex items-center gap-2 flex-shrink-0"
          style={{ minWidth: '148px' }} // 固定按钮区域最小宽度 (68px * 2 + 8px gap + 4px margin)
        >
          <button
            onClick={() => handleStateChange(AgentState.USER_CONFIRMED)}
            className="inline-flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
            style={{
              width: '68px',
              height: '34px',
              minWidth: '68px',
              minHeight: '34px',
              padding: '6px 8px',
              lineHeight: '1.2'
            }}
            title="确认执行"
          >
            <Check className="w-4 h-4 flex-shrink-0" style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>确认</span>
          </button>
          <button
            onClick={() => handleStateChange(AgentState.USER_REJECTED)}
            className="inline-flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
            style={{
              width: '68px',
              height: '34px',
              minWidth: '68px',
              minHeight: '34px',
              padding: '6px 8px',
              lineHeight: '1.2'
            }}
            title="拒绝执行"
          >
            <X className="w-4 h-4 flex-shrink-0" style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>拒绝</span>
          </button>
        </div>
      </div>
    </div>
  );
}