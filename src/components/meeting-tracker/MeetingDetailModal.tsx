'use client';

import { useState, useEffect, useCallback, memo } from 'react';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Type definitions
export interface MeetingForModal {
  id: string;
  meeting_type: 'S' | 'R' | 'N' | 'U';
  person_name?: string;
  meeting_title: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
}

export interface MeetingDetailModalProps {
  meeting: MeetingForModal;
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * MeetingDetailModal Component
 *
 * A reusable modal component for viewing and managing meeting details.
 * Provides actions for:
 * - Filling meeting reports
 * - Rescheduling meetings
 * - Canceling meetings
 * - Scheduling follow-up meetings
 *
 * Used by both UpcomingEvents calendar and Meetings list page.
 */
export const MeetingDetailModal = memo(function MeetingDetailModal({
  meeting,
  onClose,
  onRefresh
}: MeetingDetailModalProps) {
  // State for action modes
  const [showReschedule, setShowReschedule] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');

  // Follow-up form state
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpStartTime, setFollowUpStartTime] = useState('');
  const [followUpEndTime, setFollowUpEndTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const isMeetingCompleted = meeting.status === 'completed';

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  const getMeetingTypeLabel = useCallback((type: string) => {
    const labels = {
      'S': 'Sales',
      'R': 'Recruitment',
      'N': 'New',
      'U': 'Unknown',
    };
    return labels[type as keyof typeof labels] || 'Unknown';
  }, []);

  const getMeetingTypeColor = useCallback((type: string) => {
    const colors = {
      'S': 'text-blue-600 bg-blue-50',
      'R': 'text-green-600 bg-green-50',
      'N': 'text-purple-600 bg-purple-50',
      'U': 'text-gray-600 bg-gray-50',
    };
    return colors[type as keyof typeof colors] || colors['U'];
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Trap focus within modal
  useEffect(() => {
    const modal = document.getElementById('meeting-detail-modal');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    modal.addEventListener('keydown', handleTabKey as EventListener);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTabKey as EventListener);
    };
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Action Handlers
  const handleFillReport = useCallback(async () => {
    window.location.href = `/meeting-tracker/form/${meeting.id}`;
  }, [meeting.id]);

  const handleReschedule = useCallback(async () => {
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setErrorMessage('Please fill in all reschedule fields');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) throw new Error('Not authenticated');
      const { access_token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/meetings/${meeting.id}/reschedule`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_date: rescheduleDate,
            new_start_time: rescheduleStartTime,
            new_end_time: rescheduleEndTime
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reschedule meeting');
      }

      setSuccessMessage('Meeting rescheduled successfully!');
      setShowReschedule(false);
      setTimeout(() => {
        setSuccessMessage(null);
        onRefresh();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [meeting.id, rescheduleDate, rescheduleStartTime, rescheduleEndTime, onRefresh]);

  const handleCancel = useCallback(async () => {
    if (!window.confirm('Are you sure you want to cancel this meeting? This will remove it from your Google Calendar.')) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) throw new Error('Not authenticated');
      const { access_token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/meetings/${meeting.id}/cancel`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to cancel meeting');
      }

      setSuccessMessage('Meeting cancelled successfully!');
      setTimeout(() => {
        onClose();
        onRefresh();
      }, 1000);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [meeting.id, onClose, onRefresh]);

  const handleScheduleFollowUp = useCallback(async () => {
    if (!followUpDate || !followUpStartTime || !followUpEndTime) {
      setErrorMessage('Please fill in all follow-up fields');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) throw new Error('Not authenticated');
      const { access_token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/meetings/${meeting.id}/schedule-followup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            follow_up_date: followUpDate,
            follow_up_start_time: followUpStartTime,
            follow_up_end_time: followUpEndTime,
            follow_up_notes: followUpNotes || undefined
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to schedule follow-up');
      }

      setSuccessMessage('Follow-up meeting scheduled successfully!');
      setShowFollowUp(false);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
        onRefresh();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [meeting.id, followUpDate, followUpStartTime, followUpEndTime, followUpNotes, onClose, onRefresh]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        id="meeting-detail-modal"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">Meeting Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getMeetingTypeColor(meeting.meeting_type)}`}>
              {getMeetingTypeLabel(meeting.meeting_type)}
            </div>
          </div>

          {/* Person Name (if available) */}
          {meeting.person_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
              <p className="text-gray-900">{meeting.person_name}</p>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <p className="text-gray-900">{meeting.meeting_title}</p>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <p className="text-gray-900">{meeting.start_time}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <p className="text-gray-900">{meeting.end_time}</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <p className="text-gray-900 capitalize">{meeting.status}</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-6 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Reschedule Form */}
        {showReschedule && (
          <div className="px-6 pb-4 space-y-3 border-t border-gray-200 pt-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Reschedule Meeting</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  placeholder="Select date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  placeholder="HH:MM"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              Current: {meeting.start_time} - {meeting.end_time}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={loading || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setShowReschedule(false);
                  setRescheduleDate('');
                  setRescheduleStartTime('');
                  setRescheduleEndTime('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Follow-up Form */}
        {showFollowUp && (
          <div className="px-6 pb-4 space-y-3 border-t border-gray-200 pt-4 bg-green-50">
            <h3 className="text-sm font-semibold text-gray-900">Schedule Follow-up Meeting</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                  placeholder="Select date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={followUpStartTime}
                  onChange={(e) => setFollowUpStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={followUpEndTime}
                  onChange={(e) => setFollowUpEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                  placeholder="HH:MM"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Add any notes for the follow-up meeting..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScheduleFollowUp}
                disabled={loading || !followUpDate || !followUpStartTime || !followUpEndTime}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
              <button
                onClick={() => {
                  setShowFollowUp(false);
                  setFollowUpDate('');
                  setFollowUpStartTime('');
                  setFollowUpEndTime('');
                  setFollowUpNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          {/* Primary Actions - Full Width */}
          <div className="space-y-2">
            <button
              onClick={handleFillReport}
              disabled={!isMeetingCompleted || loading}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Fill Report
            </button>
            <button
              onClick={() => setShowFollowUp(true)}
              disabled={!isMeetingCompleted || loading || showFollowUp}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Schedule Follow Up
            </button>
          </div>

          {/* Secondary Actions - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowReschedule(true)}
              disabled={loading || showReschedule}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Reschedule
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              Cancel Meeting
            </button>
          </div>

          {/* Close Link */}
          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900 underline focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
