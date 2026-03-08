/**
 * Chat Input Component
 * Input field and send button for user questions
 *
 * Phase 6 of Enhanced Product Comparison Feature
 */

import { Send } from "lucide-react";
import type { ChatInputProps } from "@/types/oracle/comparison-chat";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask a question about these products...",
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2">
        {/* Textarea input */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Type your question"
          maxLength={1000}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 self-end"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Character counter */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className={value.length > 900 ? "text-amber-600 font-medium" : ""}>
          {value.length}/1000
        </span>
      </div>
    </div>
  );
}
