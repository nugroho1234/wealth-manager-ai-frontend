'use client';

import { memo, useCallback } from 'react';

// Type definitions
interface Meeting {
  id: string;
  meeting_type: 'S' | 'R' | 'N' | 'U';
  person_name?: string;
  meeting_title: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id?: string;
  has_report?: boolean;
}

interface MeetingsCompactListProps {
  meetings: Meeting[];
  viewType: string; // 'my_data', 'my_team', or subordinate user_id
  onMeetingClick: (meeting: Meeting) => void;
  loading?: boolean;
}

// Category badge colors matching the chart
const CATEGORY_STYLES = {
  S: 'bg-blue-500 text-white',       // Sales - Blue
  R: 'bg-green-500 text-white',      // Recruitment - Green
  N: 'bg-purple-500 text-white',     // New - Purple
  U: 'bg-gray-500 text-white',       // Unknown - Gray
};

const CATEGORY_LABELS = {
  S: 'Sales',
  R: 'Recruitment',
  N: 'New',
  U: 'Unknown',
};

/**
 * MeetingsCompactList Component
 *
 * Displays a compact list of meetings with different formats based on view type:
 * - My Data View (1 line): Title | Date Time | Category
 * - Team/Subordinate View (2 lines):
 *   Line 1: 👤 Name
 *   Line 2: Title | Date Time | Category
 *
 * Features:
 * - Fixed height container with independent scrolling
 * - Hover highlight on rows
 * - Click to open meeting detail modal
 * - Empty state handling
 */
export default function MeetingsCompactList({
  meetings,
  viewType,
  onMeetingClick,
  loading = false,
}: MeetingsCompactListProps) {
  const isTeamView = viewType !== 'my_data';

  // Format date and time
  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  }, []);

  // Get category label
  const getCategoryLabel = useCallback((type: string) => {
    return CATEGORY_LABELS[type as keyof typeof CATEGORY_LABELS] || 'Unknown';
  }, []);

  // Get category style
  const getCategoryStyle = useCallback((type: string) => {
    return CATEGORY_STYLES[type as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.U;
  }, []);

  // Handle keyboard events
  const handleKeyPress = useCallback((e: React.KeyboardEvent, meeting: Meeting) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMeetingClick(meeting);
    }
  }, [onMeetingClick]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Meetings List">
        <h3 className="text-lg font-semibold text-white mb-4">Meetings</h3>
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 bg-gray-700 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 bg-gray-600 rounded"></div>
                  <div className="h-4 w-32 bg-gray-600 rounded"></div>
                  <div className="h-6 w-12 bg-gray-600 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (meetings.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Meetings List">
        <h3 className="text-lg font-semibold text-white mb-4">Meetings</h3>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg">No meetings found</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your filters or date range
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Meetings List">
      <h3 className="text-lg font-semibold text-white mb-4">
        Meetings ({meetings.length})
      </h3>

      {/* Scrollable meetings list */}
      <div className="max-h-[600px] overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
        <div className="space-y-2">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-all border-2 border-transparent hover:border-gray-500"
              onClick={() => onMeetingClick(meeting)}
              onKeyPress={(e) => handleKeyPress(e, meeting)}
              role="button"
              tabIndex={0}
              aria-label={`Meeting: ${meeting.meeting_title} on ${formatDateTime(meeting.start_time)}`}
            >
              {/* Team View: 2-line format */}
              {isTeamView && meeting.person_name && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400">👤</span>
                  <span className="text-sm font-medium text-gray-200">
                    {meeting.person_name}
                  </span>
                </div>
              )}

              {/* Meeting details: 1 line */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white truncate block">
                    {meeting.meeting_title}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-1 text-xs text-gray-300">
                  <span>📅</span>
                  <span>{formatDateTime(meeting.start_time)}</span>
                </div>

                {/* Category Badge */}
                <div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryStyle(meeting.meeting_type)}`}
                  >
                    {meeting.meeting_type}
                  </span>
                </div>

                {/* XP Badge - Show only for meetings without reports */}
                {!meeting.has_report && (
                  <div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-600 text-gray-300">
                      📝 +50 XP
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoize the individual meeting item for performance
const MeetingListItem = memo(function MeetingListItem({
  meeting,
  isTeamView,
  onMeetingClick,
  formatDateTime,
  getCategoryStyle,
  handleKeyPress,
}: {
  meeting: Meeting;
  isTeamView: boolean;
  onMeetingClick: (meeting: Meeting) => void;
  formatDateTime: (dateString: string) => string;
  getCategoryStyle: (type: string) => string;
  handleKeyPress: (e: React.KeyboardEvent, meeting: Meeting) => void;
}) {
  return (
    <div
      className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-all border-2 border-transparent hover:border-gray-500"
      onClick={() => onMeetingClick(meeting)}
      onKeyPress={(e) => handleKeyPress(e, meeting)}
      role="button"
      tabIndex={0}
      aria-label={`Meeting: ${meeting.meeting_title} on ${formatDateTime(meeting.start_time)}`}
    >
      {/* Team View: 2-line format */}
      {isTeamView && meeting.person_name && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400">👤</span>
          <span className="text-sm font-medium text-gray-200">
            {meeting.person_name}
          </span>
        </div>
      )}

      {/* Meeting details: 1 line */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white truncate block">
            {meeting.meeting_title}
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-1 text-xs text-gray-300">
          <span>📅</span>
          <span>{formatDateTime(meeting.start_time)}</span>
        </div>

        {/* Category Badge */}
        <div>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryStyle(meeting.meeting_type)}`}
          >
            {meeting.meeting_type}
          </span>
        </div>
      </div>
    </div>
  );
});

// Memoize component for performance
export const MemoizedMeetingsCompactList = memo(MeetingsCompactList);
