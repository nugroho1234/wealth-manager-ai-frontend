/**
 * Mobile Sessions Bar Component
 * Bottom collapsible bar for chat sessions on mobile devices
 *
 * Phase 1 of Mobile Chat Sessions Enhancement
 */

"use client";

import { useState } from "react";
import { MessageSquare, ChevronUp, ChevronDown, Archive } from "lucide-react";
import SessionsList from "./SessionsList";

interface ChatMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sequence_number: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'deleted';
  metadata?: Record<string, any>;
}

interface ChatSession {
  session_id: string;
  user_id: string;
  insurance_id: string;
  session_name: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  session_metadata?: Record<string, any>;
}

interface ChatSessionWithDetails extends ChatSession {
  insurance_title?: string;
  insurance_company?: string;
  insurance_product_type?: string;
  activity_status?: 'recent' | 'today' | 'this_week' | 'older';
}

interface MobileSessionsBarProps {
  sessions: ChatSessionWithDetails[];
  archivedSessions: ChatSessionWithDetails[];
  currentSession: ChatSession | null;
  isLoadingSessions: boolean;
  showArchivedSessions: boolean;
  onSessionSelect: (session: ChatSessionWithDetails) => void;
  onArchiveSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onNewChat: () => void;
  onToggleArchived: () => void;
  onFetchArchivedSessions: () => void;
}

export default function MobileSessionsBar({
  sessions,
  archivedSessions,
  currentSession,
  isLoadingSessions,
  showArchivedSessions,
  onSessionSelect,
  onArchiveSession,
  onRenameSession,
  onNewChat,
  onToggleArchived,
  onFetchArchivedSessions,
}: MobileSessionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle session selection and auto-collapse
  const handleSessionSelect = (session: ChatSessionWithDetails) => {
    onSessionSelect(session);
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Mobile Sessions Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Collapsed State: Thin bar */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full h-12 bg-white/90 backdrop-blur-sm border-t border-gray-200 flex items-center justify-between px-4 shadow-lg hover:bg-white transition-colors"
            aria-label="Open chat sessions"
            aria-expanded={false}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                Chat Sessions
              </span>
              {sessions.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {sessions.length}
                </span>
              )}
            </div>
            <ChevronUp className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* Expanded State: Sessions panel */}
        {isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border border-gray-200 max-h-[60vh] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">Chat Sessions</h3>
                {sessions.length > 0 && (
                  <span className="text-xs text-gray-500">({sessions.length})</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onNewChat}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  + New
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close chat sessions"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Active Sessions List */}
            <div className="flex-1 overflow-y-auto">
              {/* Active Sessions Header */}
              <div className="px-4 pt-3 pb-2 bg-gray-50">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Active Sessions
                </h4>
              </div>

              <SessionsList
                sessions={sessions}
                currentSession={currentSession}
                isLoading={isLoadingSessions}
                onSessionSelect={handleSessionSelect}
                onRenameSession={onRenameSession}
                onArchiveSession={onArchiveSession}
                variant="mobile"
              />

              {/* Archived Sessions Toggle */}
              <div className="border-t border-gray-200 mt-2">
                <button
                  onClick={() => {
                    onToggleArchived();
                    if (!showArchivedSessions) {
                      onFetchArchivedSessions();
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Archive className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Archived Sessions ({archivedSessions.length})
                    </span>
                  </div>
                  <ChevronUp
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showArchivedSessions ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                {showArchivedSessions && (
                  <div className="bg-gray-50">
                    {archivedSessions.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-gray-500">No archived sessions</p>
                      </div>
                    ) : (
                      <SessionsList
                        sessions={archivedSessions}
                        currentSession={currentSession}
                        isLoading={false}
                        onSessionSelect={handleSessionSelect}
                        onRenameSession={onRenameSession}
                        onArchiveSession={onArchiveSession}
                        variant="mobile"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
