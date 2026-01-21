'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Type definitions
interface Meeting {
  id: string;
  meeting_type: 'S' | 'R' | 'N' | 'U';
  person_name?: string;
  meeting_title: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface DateData {
  date: string;
  day_name: string;
  meetings: Meeting[];
}

interface UpcomingEventsData {
  success: boolean;
  data: {
    date_range: {
      start_date: string;
      end_date: string;
    };
    meetings_by_date: DateData[];
  };
}

interface UpcomingEventsProps {
  viewType: string;
  onRefresh?: () => void;
}

/**
 * UpcomingEvents Component
 * Displays a 7-day horizontal calendar view of upcoming meetings
 * with support for different view types (my_data, my_team, subordinate)
 */
export default function UpcomingEvents({ viewType, onRefresh }: UpcomingEventsProps) {
  const [data, setData] = useState<UpcomingEventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [viewType]);

  // Auto-scroll to today once data is loaded
  useEffect(() => {
    if (todayRef.current && !loading && data && !hasScrolled) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        setHasScrolled(true);
      }, 100);
    }
  }, [loading, data, hasScrolled]);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    setError(null);
    setHasScrolled(false);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        throw new Error('No authentication token found');
      }
      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/meetings/upcoming-events?days=7&view_type=${viewType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming events');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  // Memoized callbacks to prevent unnecessary re-renders
  const toggleExpand = useCallback((date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }, []);

  const isToday = useCallback((dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }, []);

  const handleMeetingClick = useCallback((meeting: Meeting) => {
    setSelectedMeeting(meeting);
  }, []);

  const closeMeetingDetail = useCallback(() => {
    setSelectedMeeting(null);
  }, []);

  const handleRetry = useCallback(() => {
    fetchUpcomingEvents();
  }, [viewType]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6" role="region" aria-label="Upcoming Events">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-hidden="true"></div>
          <span className="sr-only">Loading upcoming events...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6" role="region" aria-label="Upcoming Events">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg" role="alert">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-label="Retry loading upcoming events"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.success || !data.data.meetings_by_date) {
    return (
      <div className="bg-white rounded-lg shadow p-6" role="region" aria-label="Upcoming Events">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No upcoming events data available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden" role="region" aria-label="Upcoming Events">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Upcoming Events</h2>
          <div className="text-sm text-gray-300" aria-label={`Date range: ${data.data.date_range.start_date} to ${data.data.date_range.end_date}`}>
            {new Date(data.data.date_range.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' - '}
            {new Date(data.data.date_range.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Table with horizontal scroll */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" role="table" aria-label="7-day calendar view">
            {/* Table Header - Day Names */}
            <thead>
              <tr>
                {data.data.meetings_by_date.map((dayData) => {
                  const dateObj = new Date(dayData.date + 'T00:00:00');
                  const isTodayDate = isToday(dayData.date);

                  return (
                    <th
                      key={dayData.date}
                      ref={isTodayDate ? todayRef : undefined}
                      className={`min-w-[180px] w-[14.28%] p-4 text-center border-r border-gray-700 last:border-r-0 ${
                        isTodayDate
                          ? 'bg-primary-900 border-b-2 border-b-primary-500'
                          : 'bg-gray-700 border-b border-b-gray-600'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${isTodayDate ? 'text-primary-300' : 'text-white'}`}>
                        {dayData.day_name}
                      </div>
                      <div className={`text-xs mt-1 ${isTodayDate ? 'text-primary-400' : 'text-gray-300'}`}>
                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {isTodayDate && (
                        <div className="text-xs text-primary-300 font-medium mt-1">Today</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body - Meeting Cards */}
            <tbody>
              <tr>
                {data.data.meetings_by_date.map((dayData) => {
                  const isTodayDate = isToday(dayData.date);

                  return (
                    <td
                      key={dayData.date}
                      className={`align-top p-3 border-r border-gray-700 last:border-r-0 ${
                        isTodayDate ? 'bg-primary-950/50' : 'bg-gray-800'
                      }`}
                      style={{ minHeight: '400px' }}
                    >
                      {dayData.meetings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <div className="text-4xl mb-2">📭</div>
                          <div className="text-sm">No events</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayData.meetings.map((meeting) => (
                            <CompactMeetingCard
                              key={meeting.id}
                              meeting={meeting}
                              onClick={handleMeetingClick}
                              showPersonName={viewType !== 'my_data'}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={closeMeetingDetail}
        />
      )}
    </>
  );
}

// CompactMeetingCard Sub-Component (Memoized for performance)
interface CompactMeetingCardProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
  showPersonName: boolean;
}

const CompactMeetingCard = memo(function CompactMeetingCard({ meeting, onClick, showPersonName }: CompactMeetingCardProps) {
  const getMeetingTypeStyles = useCallback((type: string) => {
    const styles = {
      'S': 'bg-blue-100 text-blue-800 border-blue-300',
      'R': 'bg-green-100 text-green-800 border-green-300',
      'N': 'bg-purple-100 text-purple-800 border-purple-300',
      'U': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return styles[type as keyof typeof styles] || styles['U'];
  }, []);

  const getMeetingTypeLabel = useCallback((type: string) => {
    const labels = {
      'S': 'Sales',
      'R': 'Recruitment',
      'N': 'New',
      'U': 'Unknown',
    };
    return labels[type as keyof typeof labels] || 'Unknown';
  }, []);

  const handleClick = useCallback(() => {
    onClick(meeting);
  }, [meeting, onClick]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(meeting);
    }
  }, [meeting, onClick]);

  const typeLabel = getMeetingTypeLabel(meeting.meeting_type);
  const ariaLabel = `${typeLabel} meeting: ${meeting.meeting_title}${showPersonName && meeting.person_name ? ` with ${meeting.person_name}` : ''}, ${meeting.start_time} to ${meeting.end_time}`;

  return (
    <div
      className="bg-gray-700 border border-gray-600 rounded-md p-2 cursor-pointer hover:bg-gray-600 hover:border-primary-400 hover:shadow-sm transition-all"
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
    >
      {/* Type Badge */}
      <div className="flex items-center justify-between mb-1">
        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getMeetingTypeStyles(meeting.meeting_type)}`}>
          {meeting.meeting_type}
        </span>
        <span className="text-xs text-gray-300">
          {meeting.start_time}
        </span>
      </div>

      {/* Meeting Title */}
      <div className="font-medium text-xs text-white mb-1 line-clamp-2">
        {meeting.meeting_title}
      </div>

      {/* Person Name (team view only) */}
      {showPersonName && meeting.person_name && (
        <div className="text-xs text-gray-300 truncate">
          {meeting.person_name}
        </div>
      )}

      {/* Status Indicator Dot */}
      {meeting.status && meeting.status !== 'scheduled' && (
        <div className="flex items-center gap-1 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            meeting.status === 'completed' ? 'bg-green-500' :
            meeting.status === 'cancelled' ? 'bg-red-500' :
            meeting.status === 'rescheduled' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}></div>
          <span className="text-xs text-gray-300 capitalize">{meeting.status}</span>
        </div>
      )}
    </div>
  );
});

// Meeting Detail Modal Component
interface MeetingDetailModalProps {
  meeting: Meeting;
  onClose: () => void;
}

const MeetingDetailModal = memo(function MeetingDetailModal({ meeting, onClose }: MeetingDetailModalProps) {
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Close
          </button>
          <button
            onClick={() => {
              window.location.href = `/meeting-tracker/meetings`;
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
});
