'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import PriorityTaskList from './PriorityTaskList';

interface Task {
  task_id: string;
  title: string;
  task_description: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  report_id?: string;
  users?: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface MeetingTaskGroupProps {
  meeting: {
    meeting_id: string;
    title: string;
    start_time: string;
    category: string;
  };
  tasks: Task[];
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  allCompleted: boolean;
  onTaskToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  isTeamView: boolean;
}

// Category badge colors matching existing design
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
 * MeetingTaskGroup Component
 *
 * Displays a collapsible group of tasks organized by meeting.
 *
 * Features:
 * - Collapsible header (starts collapsed)
 * - Meeting metadata: title, date, category badge
 * - Task summary: pending task count, overdue warning
 * - "All tasks completed" badge when all done
 * - Smooth expand/collapse animation
 */
export default function MeetingTaskGroup({
  meeting,
  tasks,
  pendingCount,
  completedCount,
  overdueCount,
  allCompleted,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  isTeamView,
}: MeetingTaskGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format meeting date
  const meetingDate = format(parseISO(meeting.start_time), 'MMM d, yyyy');

  // Get category style and label
  const categoryStyle = CATEGORY_STYLES[meeting.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.U;
  const categoryLabel = CATEGORY_LABELS[meeting.category as keyof typeof CATEGORY_LABELS] || 'Unknown';

  // Total task count
  const totalTasks = tasks.length;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Meeting Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-gray-750 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} tasks for meeting: ${meeting.title}`}
      >
        {/* Chevron Icon */}
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Meeting Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Meeting Title */}
            <h3 className="text-lg font-semibold text-white truncate">
              {meeting.title}
            </h3>

            {/* Category Badge */}
            <span className={`px-2 py-1 rounded text-xs font-semibold ${categoryStyle}`}>
              {meeting.category}
            </span>

            {/* Meeting Date */}
            <span className="text-sm text-gray-400">
              {meetingDate}
            </span>
          </div>

          {/* Task Summary */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            {allCompleted ? (
              <span className="text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All tasks completed
              </span>
            ) : (
              <>
                <span className="text-gray-400">
                  {totalTasks} task{totalTasks !== 1 ? 's' : ''}
                </span>
                {pendingCount > 0 && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-blue-400">
                      {pendingCount} pending
                    </span>
                  </>
                )}
                {overdueCount > 0 && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-red-400 flex items-center gap-1 font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      {overdueCount} overdue
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expandable Task List */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4">
          <PriorityTaskList
            tasks={tasks}
            onTaskToggle={onTaskToggle}
            onTaskEdit={onTaskEdit}
            onTaskDelete={onTaskDelete}
            isTeamView={isTeamView}
          />
        </div>
      )}
    </div>
  );
}
