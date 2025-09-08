import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface BrowserErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onReportIssue?: () => void;
}

export function BrowserErrorDisplay({ 
  error, 
  onRetry, 
  onReportIssue 
}: BrowserErrorDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-4 text-6xl">⚠️</div>
      <div className="mb-4 text-lg text-neutral-300 max-w-md">
        {error}
      </div>
      <div className="flex space-x-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {t(I18nKey.BROWSER$RETRY_BUTTON) || "重试"}
          </button>
        )}
        {onReportIssue && (
          <button
            onClick={onReportIssue}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            {t(I18nKey.BROWSER$REPORT_ISSUE_BUTTON) || "报告问题"}
          </button>
        )}
      </div>
    </div>
  );
}