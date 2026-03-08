/**
 * Clarification Buttons Component
 * Displays quick-select buttons when backend needs clarification
 *
 * Phase 6 of Enhanced Product Comparison Feature
 */

import type { ClarificationButtonsProps } from "@/types/oracle/comparison-chat";

export default function ClarificationButtons({
  message,
  options,
  onSelect,
}: ClarificationButtonsProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      {/* Clarification message */}
      <p className="text-sm text-amber-900 font-medium mb-3">{message}</p>

      {/* Product selection buttons */}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id, option.name)}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {option.name}
          </button>
        ))}
      </div>

      {/* Helper text */}
      <p className="text-xs text-amber-700 mt-3">
        Click a button to continue the conversation
      </p>
    </div>
  );
}
