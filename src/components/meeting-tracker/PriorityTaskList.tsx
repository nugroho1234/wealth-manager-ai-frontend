'use client';

import TaskItem from './TaskItem';

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

interface PriorityTaskListProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  isTeamView?: boolean;
}

// Priority section styles
const PRIORITY_STYLES = {
  high: {
    header: 'bg-red-900/30 border-red-700',
    text: 'text-red-400',
    icon: '🔴',
    label: 'HIGH PRIORITY',
  },
  medium: {
    header: 'bg-yellow-900/30 border-yellow-700',
    text: 'text-yellow-400',
    icon: '🟡',
    label: 'MEDIUM PRIORITY',
  },
  low: {
    header: 'bg-green-900/30 border-green-700',
    text: 'text-green-400',
    icon: '🟢',
    label: 'LOW PRIORITY',
  },
};

/**
 * PriorityTaskList Component
 *
 * Displays tasks organized by priority level (High → Medium → Low).
 * Tasks within each priority are already sorted by due date (earliest first).
 *
 * Features:
 * - Priority sections with colored headers
 * - Completed tasks shown with strikethrough
 * - Empty priority sections are hidden
 * - Individual task items with checkbox, edit, delete actions
 */
export default function PriorityTaskList({
  tasks,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  isTeamView = false,
}: PriorityTaskListProps) {
  // Group tasks by priority
  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low'),
  };

  // Render priority section
  const renderPrioritySection = (priority: 'high' | 'medium' | 'low') => {
    const sectionTasks = tasksByPriority[priority];
    if (sectionTasks.length === 0) return null;

    const style = PRIORITY_STYLES[priority];

    return (
      <div key={priority} className="mb-6 last:mb-0">
        {/* Priority Header */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${style.header} mb-3`}>
          <span className="text-lg">{style.icon}</span>
          <h4 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>
            {style.label}
          </h4>
          <span className="text-xs text-gray-500 ml-auto">
            {sectionTasks.length} task{sectionTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {sectionTasks.map((task) => (
            <TaskItem
              key={task.task_id}
              task={task}
              onToggle={onTaskToggle}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              isTeamView={isTeamView}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderPrioritySection('high')}
      {renderPrioritySection('medium')}
      {renderPrioritySection('low')}
    </div>
  );
}
