/**
 * Loading Indicator Component
 * Displays animated loading state while waiting for AI response
 *
 * Phase 6 of Enhanced Product Comparison Feature
 */

import type { LoadingIndicatorProps } from "@/types/oracle/comparison-chat";

export default function LoadingIndicator({
  text = "Thinking...",
}: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg w-fit">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}
