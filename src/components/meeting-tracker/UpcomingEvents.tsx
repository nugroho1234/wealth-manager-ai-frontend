'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { MeetingDetailModal, type MeetingForModal } from '@/components/meeting-tracker/MeetingDetailModal';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Type definitions
interface Meeting {
  id: string;
  meeting_type: 'S' | 'R' | 'N' | 'U';
  person_name?: string;
  meeting_title: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
  has_report?: boolean;
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

  const handleModalRefresh = useCallback(() => {
    // If parent provides onRefresh, call it (for Dashboard page)
    // Otherwise, just refresh the upcoming events (standalone usage)
    if (onRefresh) {
      onRefresh();
    } else {
      fetchUpcomingEvents();
    }
  }, [onRefresh, viewType]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Upcoming Events">
        <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-hidden="true"></div>
          <span className="sr-only">Loading upcoming events...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Upcoming Events">
        <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
        <div className="flex items-center justify-center h-64 bg-red-900/20 rounded-lg" role="alert">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
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
          onRefresh={handleModalRefresh}
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

