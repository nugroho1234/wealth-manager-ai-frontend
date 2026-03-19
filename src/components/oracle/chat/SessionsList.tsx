/**
 * Sessions List Component
 * Reusable component for rendering chat sessions
 * Used in both desktop sidebar and mobile sessions bar
 *
 * Phase 3 of Mobile Chat Sessions Enhancement
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Archive } from "lucide-react";

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

interface SessionsListProps {
  sessions: ChatSessionWithDetails[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  onSessionSelect: (session: ChatSessionWithDetails) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onArchiveSession: (sessionId: string) => void;
  variant?: 'desktop' | 'mobile';
}

export default function SessionsList({
  sessions,
  currentSession,
  isLoading,
  onSessionSelect,
  onRenameSession,
  onArchiveSession,
  variant = 'desktop',
}: SessionsListProps) {
  const [showSessionActions, setShowSessionActions] = useState<string | null>(null);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sessionActionsRef = useRef<HTMLDivElement>(null);

  // Handle click outside for session actions
  useEffect(() => {
    if (!showSessionActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sessionActionsRef.current && !sessionActionsRef.current.contains(event.target as Node)) {
        setShowSessionActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSessionActions]);

  // Handle rename
  const handleRename = (sessionId: string) => {
    const session = sessions.find(s => s.session_id === sessionId);
    if (session) {
      setRenameSessionId(sessionId);
      setRenameValue(session.session_name);
      setShowSessionActions(null);
    }
  };

  // Submit rename
  const submitRename = () => {
    if (renameSessionId && renameValue.trim()) {
      onRenameSession(renameSessionId, renameValue.trim());
      setRenameSessionId(null);
      setRenameValue('');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading sessions...</p>
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">No Active Sessions</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Start a new chat by clicking the &quot;+ New&quot; button above.
        </p>
      </div>
    );
  }

  // Sessions list
  return (
    <>
      <div className={variant === 'mobile' ? 'space-y-1 p-2' : 'space-y-2'}>
        {sessions.map((session) => (
          <div
            key={session.session_id}
            className={`relative group rounded-lg transition-all duration-200 ${
              variant === 'mobile' ? 'p-3' : 'p-3'
            } ${
              currentSession?.session_id === session.session_id
                ? 'bg-primary-50 border border-primary-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div
              onClick={() => onSessionSelect(session)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {session.session_name}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {session.insurance_title || session.insurance_company}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {session.message_count} messages
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(session.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="relative" ref={showSessionActions === session.session_id ? sessionActionsRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSessionActions(
                        showSessionActions === session.session_id ? null : session.session_id
                      );
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showSessionActions === session.session_id && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session.session_id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveSession(session.session_id);
                          setShowSessionActions(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rename Session Modal */}
      {renameSessionId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rename Session</h3>
              <button
                onClick={() => {
                  setRenameSessionId(null);
                  setRenameValue('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    submitRename();
                  } else if (e.key === 'Escape') {
                    setRenameSessionId(null);
                    setRenameValue('');
                  }
                }}
                placeholder="Enter new session name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter to save, Escape to cancel
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setRenameSessionId(null);
                  setRenameValue('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                disabled={!renameValue.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
