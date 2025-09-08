import { RealBrowserTab } from "./real-browser-tab";
import { useConversationId } from "#/hooks/use-conversation-id";

/**
 * 浏览器面板组件 - 现在使用真实浏览器选项卡替代截图模式
 */
export function BrowserPanel() {
  const { conversationId } = useConversationId();

  return (
    <div className="h-full w-full">
      <RealBrowserTab conversationId={conversationId} />
    </div>
  );
}
