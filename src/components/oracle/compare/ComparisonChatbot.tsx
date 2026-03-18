/**
 * Comparison Chatbot Component
 * Main chatbot component for product comparison page
 *
 * Phase 6 of Enhanced Product Comparison Feature
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import type {
  ComparisonChatbotProps,
  ChatMessage,
  ClarificationResponse,
} from "@/types/oracle/comparison-chat";
import {
  isAnswerResponse,
  isClarificationResponse,
} from "@/types/oracle/comparison-chat";
import { sendChatMessage, formatClarificationQuestion } from "@/lib/api/oracle/compare";
import ChatMessageComponent from "./ChatMessage";
import ChatInput from "./ChatInput";
import LoadingIndicator from "./LoadingIndicator";
import ClarificationButtons from "./ClarificationButtons";

export default function ComparisonChatbot({
  insuranceIds,
  products,
}: ComparisonChatbotProps) {
  // State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingClarification, setPendingClarification] =
    useState<ClarificationResponse | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedHistory = useRef(false);

  // Session storage key
  const storageKey = `chat-history-${insuranceIds.sort().join("-")}`;

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setChatHistory(parsed);
      }
      hasLoadedHistory.current = true;
    } catch (err) {
      console.error("Failed to load chat history:", err);
      hasLoadedHistory.current = true;
    }
  }, [storageKey]);

  // Save chat history to sessionStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!hasLoadedHistory.current) return; // Don't save until we've loaded

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(chatHistory));
    } catch (err) {
      console.error("Failed to save chat history:", err);
    }
  }, [chatHistory, storageKey]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading, pendingClarification]);

  // Listen for clear chat event from FloatingChatContainer
  useEffect(() => {
    const handleClearChat = () => {
      setChatHistory([]);
      setPendingClarification(null);
      setError(null);
    };

    window.addEventListener('clearChatHistory', handleClearChat);
    return () => {
      window.removeEventListener('clearChatHistory', handleClearChat);
    };
  }, []);

  // Scroll to bottom when chat expands
  useEffect(() => {
    const handleChatExpanded = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    window.addEventListener('chatExpanded', handleChatExpanded);
    return () => {
      window.removeEventListener('chatExpanded', handleChatExpanded);
    };
  }, []);

  // Handle sending a message
  const handleSendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    // Clear any previous errors
    setError(null);
    setPendingClarification(null);

    // Add user message to chat history
    const userMessage: ChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Send message to API
      const response = await sendChatMessage(
        question,
        insuranceIds,
        chatHistory
      );

      // Handle response based on type
      if (isAnswerResponse(response)) {
        // Debug logging
        // console.log("[ComparisonChatbot] Answer received:", {
        //   answerLength: response.answer.length,
        //   answerPreview: response.answer.substring(0, 200),
        //   source: response.source,
        //   referencesCount: response.references?.length || 0,
        //   references: response.references, // Log actual references
        // });

        // Add AI answer to chat history
        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.answer,
          timestamp: response.timestamp,
          references: response.references,
          source: response.source,
          tier: response.tier,
          insurance_id: response.insurance_id,
          products: response.products,
        };

        setChatHistory((prev) => [...prev, aiMessage]);

        // console.log("[ComparisonChatbot] Chat history updated, new length:", chatHistory.length + 1);
      } else if (isClarificationResponse(response)) {
        // Show clarification buttons
        setPendingClarification(response);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clarification option selection
  const handleClarificationSelect = (productId: string, productName: string) => {
    if (!pendingClarification) return;

    // Get the original question from the last user message
    const lastUserMessage = chatHistory
      .slice()
      .reverse()
      .find((msg) => msg.role === "user");

    const originalQuestion = lastUserMessage?.content || "";

    // Format the clarification as a new question
    const clarificationQuestion = formatClarificationQuestion(
      productId,
      productName,
      originalQuestion
    );

    // Clear pending clarification
    setPendingClarification(null);

    // Send the formatted question
    handleSendMessage(clarificationQuestion);
  };

  // Handle submit from ChatInput
  const handleSubmit = () => {
    handleSendMessage(inputValue);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state */}
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">
              Ask me anything about these products
            </p>
            <p className="text-xs text-gray-400">
              I can answer in English or Indonesian
            </p>
          </div>
        )}

        {/* Chat messages */}
        {chatHistory.map((message, index) => {
          // For RAG responses, find the PDF URL from the insurance_id in the message
          // For multi-product comparisons, we might not have a single PDF
          let pdfUrl: string | undefined;

          if (message.source === "rag" && message.insurance_id) {
            // RAG responses are for single products - find the matching product
            const matchingProduct = products.find(p => p.insurance_id === message.insurance_id);
            pdfUrl = matchingProduct?.pdf_url;
          }

          return (
            <ChatMessageComponent
              key={index}
              message={message}
              pdfUrl={pdfUrl}
            />
          );
        })}

        {/* Loading indicator */}
        {isLoading && <LoadingIndicator />}

        {/* Clarification buttons */}
        {pendingClarification && (
          <ClarificationButtons
            message={pendingClarification.message}
            options={pendingClarification.options}
            onSelect={handleClarificationSelect}
          />
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
