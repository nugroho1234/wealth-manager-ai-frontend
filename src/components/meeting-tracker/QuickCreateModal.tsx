'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserSelectorDropdown from './UserSelectorDropdown';
import MeetingForm, { MeetingFormData } from './MeetingForm';
import TaskForm, { TaskFormData } from './TaskForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * QuickCreateModal Component
 *
 * Modal that allows users to choose between creating a meeting or a task.
 * Phase 2: Added user selection for leaders.
 */
type ModalView = 'select' | 'meeting-form' | 'task-form';

export default function QuickCreateModal({ isOpen, onClose }: QuickCreateModalProps) {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLeader, setIsLeader] = useState(false);
  const [checkingLeaderStatus, setCheckingLeaderStatus] = useState(true);
  const [currentView, setCurrentView] = useState<ModalView>('select');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close modal on ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Initialize selected user to current user when modal opens or user changes
  useEffect(() => {
    if (user?.id) {
      setSelectedUserId(user.id);
    }
  }, [user]);

  // Check if user is a leader
  useEffect(() => {
    if (!isOpen) return;

    const checkLeaderStatus = async () => {
      try {
        const authTokens = localStorage.getItem('auth_tokens');
        if (!authTokens) return;
        const { access_token: token } = JSON.parse(authTokens);

        const response = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setIsLeader(data.is_leader || false);
        }
      } catch (error) {
        console.error('Failed to check leader status:', error);
      } finally {
        setCheckingLeaderStatus(false);
      }
    };

    checkLeaderStatus();
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('select');
    }
  }, [isOpen]);

  const handleCreateMeeting = async (meetingData: MeetingFormData) => {
    setIsSubmitting(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        throw new Error('Not authenticated');
      }
      const { access_token: token } = JSON.parse(authTokens);

      // Combine date + time into ISO format
      const startTime = new Date(`${meetingData.date}T${meetingData.start_time}`).toISOString();
      const endTime = new Date(`${meetingData.date}T${meetingData.end_time}`).toISOString();

      const response = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: meetingData.title,
          category: meetingData.category,
          start_time: startTime,
          end_time: endTime,
          description: meetingData.description || null,
          target_user_id: selectedUserId !== user?.id ? selectedUserId : null,
          sync_to_calendar: true, // Enable Google Calendar sync by default
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create meeting');
      }

      const result = await response.json();

      // Success! Close modal and show success message
      const forWhom = selectedUserId === user?.id ? 'yourself' : 'your team member';
      alert(`Meeting "${result.meeting.title}" created successfully for ${forWhom} and synced to Google Calendar!`);
      onClose();

      // Refresh the page to show the new meeting
      window.location.reload();
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert(error instanceof Error ? error.message : 'Failed to create meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (taskData: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        throw new Error('Not authenticated');
      }
      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_description: taskData.task_description,
          priority: taskData.priority,
          due_date: taskData.due_date,
          assigned_to: taskData.assigned_to || null,
          meeting_id: null, // Manual task, not linked to a meeting
          target_user_id: selectedUserId !== user?.id ? selectedUserId : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create task');
      }

      const result = await response.json();

      // Success! Close modal and show success message
      const forWhom = selectedUserId === user?.id ? 'yourself' : 'your team member';
      alert(`Task created successfully for ${forWhom}!`);
      onClose();

      // Refresh the page to show the new task
      window.location.reload();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(error instanceof Error ? error.message : 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setCurrentView('select');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {currentView !== 'select' && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded p-1"
                aria-label="Go back"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {currentView === 'select' && 'Quick Create'}
              {currentView === 'meeting-form' && 'Create Meeting'}
              {currentView === 'task-form' && 'Create Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded p-1"
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {currentView === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm mb-6">
                What would you like to create?
              </p>

              {/* User Selector - Only show for leaders */}
              {!checkingLeaderStatus && isLeader && (
                <div className="mb-6">
                  <UserSelectorDropdown
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    label="Create for"
                  />
                </div>
              )}

              {/* Create Meeting Option */}
              <button
                onClick={() => setCurrentView('meeting-form')}
                className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-transparent hover:border-primary-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-semibold mb-1">Create Meeting</h3>
              <p className="text-gray-400 text-sm">
                Schedule a new meeting with details
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

              {/* Create Task Option */}
              <button
                onClick={() => setCurrentView('task-form')}
                className="w-full flex items-center gap-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-transparent hover:border-primary-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
            <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-semibold mb-1">Create Task</h3>
              <p className="text-gray-400 text-sm">
                Add a new task or action item
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
            </div>
          )}

          {currentView === 'meeting-form' && (
            <MeetingForm
              selectedUserId={selectedUserId || user?.id || ''}
              onSubmit={handleCreateMeeting}
              onCancel={handleBack}
            />
          )}

          {currentView === 'task-form' && (
            <TaskForm
              selectedUserId={selectedUserId || user?.id || ''}
              onSubmit={handleCreateTask}
              onCancel={handleBack}
            />
          )}
        </div>

        {/* Footer - Only show on select view */}
        {currentView === 'select' && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-750 border-t border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
