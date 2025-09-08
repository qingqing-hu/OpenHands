import React from "react";
import { Copy, Check } from "lucide-react";

interface InsightAICopyButtonProps {
  text: string;
  isVisible: boolean;
  className?: string;
}

export function InsightAICopyButton({
  text,
  isVisible,
  className = "",
}: InsightAICopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  React.useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={handleCopy}
      disabled={isCopied}
      className={`
        flex items-center justify-center w-8 h-8 rounded-md
        bg-insight-surface-hover hover:bg-insight-surface-active
        text-insight-text-secondary hover:text-insight-text-primary
        transition-all duration-200 
        ${isCopied ? "text-green-500" : ""}
        ${className}
      `}
      title={isCopied ? "已复制！" : "复制到剪贴板"}
    >
      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
