/**
 * Floating Chat Container Component
 * Provides a collapsible floating chat interface for the comparison page
 *
 * Phase 1 of Collapsible Chat Feature
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Minimize2, Trash2 } from "lucide-react";
import ComparisonChatbot from "./ComparisonChatbot";
import { InsuranceProduct } from "@/types/oracle/insurance-product";

interface FloatingChatContainerProps {
  insuranceIds: string[];
  products: InsuranceProduct[];
}

export default function FloatingChatContainer({
  insuranceIds,
  products,
}: FloatingChatContainerProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasChatHistory, setHasChatHistory] = useState(false);

  // Storage keys
  const storageKey = `chat-expanded-${insuranceIds.sort().join("-")}`;
  const chatStorageKey = `chat-history-${insuranceIds.sort().join("-")}`;

  // Load expanded state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsExpanded(saved === "true");
      }
    } catch (err) {
      console.error("Failed to load chat expanded state:", err);
    }
  }, [storageKey]);

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, isExpanded.toString());
    } catch (err) {
      console.error("Failed to save chat expanded state:", err);
    }
  }, [isExpanded, storageKey]);

  // Listen for custom event to open chat with question (from Quick Action Buttons)
  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<{ question: string }>;
      setIsExpanded(true);

      // Small delay to ensure chat is rendered before setting input
      setTimeout(() => {
        const chatInput = document.querySelector(
          'textarea[placeholder*="Ask"]'
        ) as HTMLTextAreaElement;
        if (chatInput && customEvent.detail?.question) {
          chatInput.value = customEvent.detail.question;
          chatInput.focus();
          // Trigger input event to update React state
          const inputEvent = new Event("input", { bubbles: true });
          chatInput.dispatchEvent(inputEvent);
        }
      }, 100);
    };

    window.addEventListener("openChatWithQuestion", handleOpenChat);
    return () => {
      window.removeEventListener("openChatWithQuestion", handleOpenChat);
    };
  }, []);

  // Check if chat history exists
  useEffect(() => {
    const checkChatHistory = () => {
      try {
        const saved = sessionStorage.getItem(chatStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setHasChatHistory(parsed.length > 0);
        } else {
          setHasChatHistory(false);
        }
      } catch {
        setHasChatHistory(false);
      }
    };

    checkChatHistory();
    // Check periodically in case chat history changes
    const interval = setInterval(checkChatHistory, 1000);
    return () => clearInterval(interval);
  }, [chatStorageKey]);

  // Toggle expanded state
  const toggleExpanded = () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) {
      setHasUnreadMessages(false); // Clear unread when opening
      // Dispatch event to scroll chat to bottom when opened
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('chatExpanded'));
      }, 100);
    }
  };

  // Handle backdrop click (minimize chat)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  // Handle clear chat
  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history? This will delete all messages.")) {
      sessionStorage.removeItem(chatStorageKey);
      setHasChatHistory(false);
      // Trigger a custom event to notify ComparisonChatbot to clear its state
      window.dispatchEvent(new CustomEvent('clearChatHistory'));
    }
  };

  return (
    <>
      {/* Backdrop (visible when expanded) */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={handleBackdropClick}
        />
      )}

      {/* Floating Chat Container */}
      <div className="fixed bottom-6 right-6 z-50 pdf-hide">
        {/* Collapsed State: Floating Button */}
        <button
          onClick={toggleExpanded}
          className={`relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group ${isExpanded ? 'hidden' : 'flex'}`}
          aria-label="Open chat"
        >
          <MessageSquare className="w-7 h-7" />

          {/* Unread Badge */}
          {hasUnreadMessages && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}

          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat Assistant
          </span>

          {/* Pulse animation on hover */}
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-30 animate-ping" />
        </button>

        {/* Expanded State: Chat Panel - Always rendered, conditionally visible */}
        <div className={`w-[450px] h-[700px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'block animate-in slide-in-from-bottom-5' : 'hidden'}`}>
          {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Chat Assistant
                  </h3>
                  <p className="text-xs text-blue-100">
                    Ask about {products.length} products
                  </p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center space-x-2">
                {/* Clear Chat Button - only show if there's chat history */}
                {hasChatHistory && (
                  <button
                    onClick={handleClearChat}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors group/clear"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                )}

                {/* Minimize Button */}
                <button
                  onClick={toggleExpanded}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Minimize chat"
                  title="Minimize chat"
                >
                  <Minimize2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <ComparisonChatbot
              insuranceIds={insuranceIds}
              products={products}
            />
          </div>
        </div>
      </div>
    </>
  );
}
