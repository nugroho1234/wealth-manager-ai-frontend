'use client';

import { format, parseISO, isPast, isToday } from 'date-fns';

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

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  isTeamView?: boolean;
}

/**
 * TaskItem Component
 *
 * Individual task row with actions.
 *
 * Features:
 * - Desktop layout: checkbox, description, due date, action icons (edit, delete)
 * - Mobile layout: stacked design with responsive actions
 * - Completed state: strikethrough text, checked checkbox
 * - Overdue indicator: red due date with warning icon
 * - Team view: shows assigned user information
 */
export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  isTeamView = false,
}: TaskItemProps) {
  const isCompleted = task.status === 'completed';

  // Check if task is overdue
  const isOverdue = () => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  };

  const overdue = isOverdue();
  const dueDate = format(parseISO(task.due_date), 'MMM d, yyyy');

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border ${
        isCompleted ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-800 border-gray-700'
      } hover:border-gray-600 transition-colors`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.task_id, isCompleted ? 'pending' : 'completed')}
        className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-600 hover:border-blue-500 transition-colors flex items-center justify-center self-start md:self-center"
        aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
      >
        {isCompleted && (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {/* Task Title/Description with XP Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
            {task.task_description || task.title}
          </p>

          {/* XP Badge - Show only for non-completed tasks */}
          {!isCompleted && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300 whitespace-nowrap">
              ✅ +{task.priority === 'high' ? '50' : task.priority === 'medium' ? '30' : '20'} XP
            </span>
          )}
        </div>

        {/* Team View: Show assigned user */}
        {isTeamView && task.users && (
          <p className="text-xs text-gray-500 mt-1">
            Assigned to: {task.users.first_name} {task.users.last_name}
          </p>
        )}
      </div>

      {/* Due Date - Desktop and Mobile */}
      <div className="flex-shrink-0 flex items-center gap-2 md:text-right">
        <p
          className={`text-xs font-medium ${
            overdue ? 'text-red-400 font-semibold' : isCompleted ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          {overdue && !isCompleted && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </span>
          )}
          Due: {dueDate}
        </p>
      </div>

      {/* Action Buttons - Desktop: Inline, Mobile: Menu dots */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Desktop: Show edit and delete buttons */}
        <div className="hidden md:flex items-center gap-2">
          {/* Edit Button */}
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
            aria-label="Edit task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(task.task_id)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
            aria-label="Delete task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile: Show menu dots dropdown */}
        <div className="md:hidden relative group">
          <button
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            aria-label="Task actions menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => onEdit(task)}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-t-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={() => onDelete(task.task_id)}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-b-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
