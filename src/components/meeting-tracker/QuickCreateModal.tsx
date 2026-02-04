'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserSelectorDropdown from './UserSelectorDropdown';
import MeetingForm, { MeetingFormData } from './MeetingForm';
import MultiTaskForm from './MultiTaskForm';
import { TaskFormFieldsData } from './TaskFormFields';
import { subDays, addDays } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Meeting interface for dropdown
interface MeetingOption {
  meeting_id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  has_report: boolean;
}

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

  // Meeting selection state
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [loadingMeetings, setLoadingMeetings] = useState(false);

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

  // Fetch meetings for user when task form opens or user changes
  useEffect(() => {
    if (currentView === 'task-form' && selectedUserId) {
      fetchMeetingsForUser(selectedUserId);
      setSelectedMeetingId(''); // Reset meeting selection when user changes
    }
  }, [currentView, selectedUserId]);

  // Fetch meetings function
  const fetchMeetingsForUser = async (userId: string) => {
    setLoadingMeetings(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Calculate date range: last 30 days only (no future meetings since they can't have reports yet)
      const now = new Date();
      const dateFrom = subDays(now, 30).toISOString();
      const dateTo = now.toISOString();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/meetings?user_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&status=completed`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Sort by start_time descending (most recent first)
        const sortedMeetings = (data.meetings || []).sort((a: MeetingOption, b: MeetingOption) => {
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        });
        setMeetings(sortedMeetings);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

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

  const handleCreateTask = async (tasks: TaskFormFieldsData[]) => {
    setIsSubmitting(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        throw new Error('Not authenticated');
      }
      const { access_token: token } = JSON.parse(authTokens);

      // Phase 5: Use bulk endpoint for creating multiple tasks in one request
      const response = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/tasks/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: selectedMeetingId,
          target_user_id: selectedUserId !== user?.id ? selectedUserId : null,
          tasks: tasks.map(task => ({
            task_description: task.task_description,
            priority: task.priority,
            due_date: task.due_date,
            assigned_to: task.assigned_to || null,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create tasks');
      }

      const result = await response.json();

      // Success! Close modal and show success message
      const forWhom = selectedUserId === user?.id ? 'yourself' : 'your team member';
      const taskCount = result.statistics?.total_created || tasks.length;
      const taskWord = taskCount === 1 ? 'task' : 'tasks';
      alert(`${taskCount} ${taskWord} created successfully for ${forWhom}!`);
      onClose();

      // Refresh the page to show the new tasks
      window.location.reload();
    } catch (error) {
      console.error('Failed to create tasks:', error);
      alert(error instanceof Error ? error.message : 'Failed to create tasks. Please try again.');
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
            <div className="space-y-4">
              {/* Meeting Selection Dropdown */}
              <div>
                <label htmlFor="meeting_select" className="block text-sm font-medium text-gray-300 mb-1">
                  Select Meeting <span className="text-red-500">*</span>
                </label>
                {loadingMeetings ? (
                  <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading meetings...
                  </div>
                ) : (
                  <select
                    id="meeting_select"
                    value={selectedMeetingId}
                    onChange={(e) => setSelectedMeetingId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Select a meeting --</option>
                    {meetings.map((meeting) => {
                      // Format: "Jan 24, 2026 10:00 AM - Meeting Title (Category)"
                      const startDate = new Date(meeting.start_time);
                      const dateFormatted = startDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const timeFormatted = startDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const categoryLabels: { [key: string]: string } = {
                        S: 'Sales',
                        R: 'Recruitment',
                        N: 'New',
                        U: 'Unknown',
                      };
                      const categoryLabel = categoryLabels[meeting.category] || 'Unknown';

                      return (
                        <option key={meeting.meeting_id} value={meeting.meeting_id}>
                          {`${dateFormatted} ${timeFormatted} - ${meeting.title} (${categoryLabel})`}
                        </option>
                      );
                    })}
                  </select>
                )}
                {!loadingMeetings && meetings.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    No meetings found in the last 30 days
                  </p>
                )}
              </div>

              {/* Report Validation Warning - Show when meeting selected but has no report */}
              {selectedMeetingId && !meetings.find(m => m.meeting_id === selectedMeetingId)?.has_report && (
                <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-400 mb-1">
                        Meeting Report Required
                      </h4>
                      <p className="text-sm text-yellow-200 mb-3">
                        This meeting doesn't have a report yet. Please fill out the meeting report first to create tasks.
                        You can also create tasks directly from the report page.
                      </p>
                      <button
                        onClick={() => {
                          // Navigate to meeting report form page
                          window.location.href = `/meeting-tracker/form/${selectedMeetingId}`;
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Fill Meeting Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Task Form - Only show if meeting is selected AND has report */}
              {selectedMeetingId && meetings.find(m => m.meeting_id === selectedMeetingId)?.has_report && (
                <MultiTaskForm
                  selectedUserId={selectedUserId || user?.id || ''}
                  onSubmit={handleCreateTask}
                  onCancel={handleBack}
                />
              )}

              {/* Show message if no meeting selected */}
              {!selectedMeetingId && !loadingMeetings && meetings.length > 0 && (
                <div className="p-4 bg-gray-700 rounded-lg text-center text-gray-400 text-sm">
                  Please select a meeting to create tasks
                </div>
              )}
            </div>
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
