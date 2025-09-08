import { RealBrowserTab } from "#/components/features/browser/real-browser-tab";
import { useConversationId } from "#/hooks/use-conversation-id";

function Browser() {
  const { conversationId } = useConversationId();
  
  return <RealBrowserTab conversationId={conversationId} />;
}

export default Browser;
