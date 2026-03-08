/**
 * Chat Message Component
 * Displays individual user or assistant messages with references
 *
 * Phase 6 of Enhanced Product Comparison Feature
 */

import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import PageBadge from "@/components/PageBadge";
import type {
  ChatMessageProps,
  Reference,
} from "@/types/oracle/comparison-chat";
import {
  isPageReference,
  isSectionReference,
} from "@/types/oracle/comparison-chat";

export default function ChatMessage({ message, isLoading, pdfUrl }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900 border border-gray-200"
        }`}
      >
        {/* Message content */}
        <div className="text-sm">
          {isUser ? (
            // User messages: plain text
            <div className="whitespace-pre-wrap break-words text-white">
              {message.content}
            </div>
          ) : (
            // Assistant messages: markdown
            <div className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-li:text-gray-800">
              <ReactMarkdown
                components={{
                  // Customize markdown rendering for better styling
                  h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2 text-gray-900" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1 text-gray-900" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 text-gray-800" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-gray-800" {...props} />,
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4 -mx-2">
                      <table className="min-w-full divide-y divide-gray-300 border border-gray-300 text-xs" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 bg-white" {...props} />,
                  tr: ({ node, ...props }) => <tr className="divide-x divide-gray-200" {...props} />,
                  th: ({ node, ...props }) => (
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300 last:border-r-0"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="px-2 py-2 text-xs text-gray-700 border-r border-gray-300 last:border-r-0"
                      {...props}
                    />
                  ),
                  strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                  em: ({ node, ...props }) => <em className="italic text-gray-800" {...props} />,
                  code: ({ node, ...props }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* References (only for assistant messages from RAG with page numbers) */}
        {!isUser && message.source === "rag" && message.references && message.references.length > 0 && pdfUrl && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-1.5">
              {message.references.map((ref, index) => (
                <ReferenceBadge key={index} reference={ref} pdfUrl={pdfUrl} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <div
            className={`text-xs mt-2 ${
              isUser ? "text-blue-200" : "text-gray-500"
            }`}
          >
            {formatDistanceToNow(new Date(message.timestamp), {
              addSuffix: true,
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reference Badge Component
 * Displays page numbers or section references as clickable badges
 */
function ReferenceBadge({ reference, pdfUrl }: { reference: Reference; pdfUrl: string }) {
  if (isPageReference(reference)) {
    return (
      <PageBadge
        page={reference.page}
        section={reference.section}
        pdfUrl={pdfUrl}
      />
    );
  }

  if (isSectionReference(reference)) {
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
        title={reference.sections.join(", ")}
      >
        {reference.insurance_name}: {reference.sections[0]}
        {reference.sections.length > 1 && ` +${reference.sections.length - 1}`}
      </span>
    );
  }

  return null;
}
