'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import TeamFilter from '@/components/meeting-tracker/TeamFilter';
import ViewContextBanner from '@/components/meeting-tracker/ViewContextBanner';
import FloatingActionButton from '@/components/meeting-tracker/FloatingActionButton';
import QuickCreateModal from '@/components/meeting-tracker/QuickCreateModal';
import MeetingTaskGroup from '@/components/meeting-tracker/MeetingTaskGroup';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, addDays } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type DateRangeFilter = 'this_month' | 'last_7_days' | 'last_30_days' | 'this_week' | 'last_month' | 'this_year' | 'last_year' | 'custom' | 'all_time';

interface Task {
  task_id: string;
  title: string;
  task_description: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  report_id?: string;
  meetings?: {
    meeting_id: string;
    title: string;
    category: string;
    start_time: string;
  };
  users?: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface Statistics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

interface GroupedTasks {
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
}

function TasksContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
  });

  // Team filter
  const [teamFilter, setTeamFilter] = useState<string>('me');

  // Date range filter
  const [dateRange, setDateRange] = useState<DateRangeFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Quick Create Modal state
  const [isQuickCreateModalOpen, setIsQuickCreateModalOpen] = useState(false);

  // Initialize team filter from URL query parameter
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) {
      setTeamFilter(viewParam);
    }
  }, [searchParams]);

  // Load date filter preference from localStorage on mount
  useEffect(() => {
    const savedDateRange = localStorage.getItem('tasks_date_range');
    if (savedDateRange) {
      setDateRange(savedDateRange as DateRangeFilter);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, teamFilter, statusFilter, priorityFilter, dateRange, customStartDate, customEndDate]);

  const fetchTasks = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (teamFilter && teamFilter !== 'me') params.append('team_filter', teamFilter);

      // Add date range filters
      const { start, end } = getDateRange();
      if (start) params.append('due_from', format(start, 'yyyy-MM-dd'));
      if (end) params.append('due_to', format(end, 'yyyy-MM-dd'));

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/tasks/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch tasks');

      const data = await res.json();
      const fetchedTasks = data.tasks || [];

      setTasks(fetchedTasks);
      setStatistics(data.statistics || { total: 0, completed: 0, pending: 0, overdue: 0 });

      // Group and sort tasks
      const grouped = groupAndSortTasks(fetchedTasks);
      setGroupedTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group tasks by meeting and sort them according to the plan
  const groupAndSortTasks = (tasks: Task[]): GroupedTasks[] => {
    // Filter out tasks without meeting information
    const tasksWithMeetings = tasks.filter(task => task.meetings);

    // Group by meeting_id
    const tasksByMeeting: Record<string, Task[]> = {};
    tasksWithMeetings.forEach(task => {
      if (task.meetings) {
        const meetingId = task.meetings.meeting_id;
        if (!tasksByMeeting[meetingId]) {
          tasksByMeeting[meetingId] = [];
        }
        tasksByMeeting[meetingId].push(task);
      }
    });

    // Convert to grouped array and sort tasks within each group
    const grouped: GroupedTasks[] = Object.keys(tasksByMeeting).map(meetingId => {
      const meetingTasks = tasksByMeeting[meetingId];
      const firstTask = meetingTasks[0];

      // Sort tasks within meeting: Priority (high → medium → low) → Due date (earliest first)
      const sortedTasks = [...meetingTasks].sort((a, b) => {
        // Priority order
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Within same priority, sort by due date (earliest first)
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      // Calculate statistics for this meeting's tasks
      const pendingTasks = meetingTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const completedTasks = meetingTasks.filter(t => t.status === 'completed');
      const overdueTasks = meetingTasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
      });

      return {
        meeting: {
          meeting_id: firstTask.meetings!.meeting_id,
          title: firstTask.meetings!.title,
          start_time: firstTask.meetings!.start_time,
          category: firstTask.meetings!.category,
        },
        tasks: sortedTasks,
        pendingCount: pendingTasks.length,
        completedCount: completedTasks.length,
        overdueCount: overdueTasks.length,
        allCompleted: completedTasks.length === meetingTasks.length,
      };
    });

    // Sort meetings by start_time (earliest first)
    grouped.sort((a, b) => {
      return new Date(a.meeting.start_time).getTime() - new Date(b.meeting.start_time).getTime();
    });

    return grouped;
  };

  // Get date range based on selected filter
  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();

    switch (dateRange) {
      case 'last_7_days':
        return { start: subDays(now, 7), end: now };

      case 'last_30_days':
        return { start: subDays(now, 30), end: now };

      case 'this_week':
        return { start: startOfWeek(now), end: endOfWeek(now) };

      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };

      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };

      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };

      case 'last_year':
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };

      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59')
          };
        }
        return { start: null, end: null };

      case 'all_time':
      default:
        return { start: null, end: null };
    }
  };

  // Get label for current date filter
  const getDateRangeLabel = (): string => {
    switch (dateRange) {
      case 'last_7_days': return 'Last 7 Days';
      case 'last_30_days': return 'Last 30 Days';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_year': return 'This Year';
      case 'last_year': return 'Last Year';
      case 'custom': return 'Custom Range';
      case 'all_time': return 'All Time';
      default: return 'This Month';
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRangeFilter) => {
    setDateRange(range);
    localStorage.setItem('tasks_date_range', range);
  };

  const toggleTaskStatus = async (taskId: string, newStatus: 'pending' | 'completed') => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update task');

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const editTask = (task: Task) => {
    // TODO: Phase 6 - Implement edit modal
    console.log('Edit task:', task);
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete task');

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle team filter change and update URL
  const handleTeamFilterChange = (newFilter: string) => {
    setTeamFilter(newFilter);

    // Update URL query parameter
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter && newFilter !== 'me') {
      params.set('view', newFilter);
    } else {
      params.delete('view');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!user) return null;

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-gray-400 text-xl">Loading tasks...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  // Check if viewing team data
  const isTeamView = teamFilter !== 'me';

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
            <p className="text-gray-400">Manage your meeting tasks and action items</p>
          </div>

          {/* View Context Banner */}
          <ViewContextBanner userId={teamFilter !== 'me' && teamFilter !== 'team' ? teamFilter : null} />

          {/* Team Filter + Date Range Filter Row */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Team Filter (only shows for leaders) */}
              <TeamFilter
                value={teamFilter}
                onChange={handleTeamFilterChange}
                className=""
              />

              {/* Date Range Filter */}
              <div className="flex items-center gap-2 md:ml-auto">
                <label htmlFor="date-range" className="text-sm font-medium text-gray-300">
                  Date Range:
                </label>
                <select
                  id="date-range"
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value as DateRangeFilter)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="this_month">This Month</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_week">This Week</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                  <option value="last_year">Last Year</option>
                  <option value="custom">Custom Range</option>
                  <option value="all_time">All Time</option>
                </select>
              </div>
            </div>

            {/* Custom date pickers */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">From</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">To</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Visual feedback showing active filter */}
          <div className="mb-6 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Showing:</span>
            </div>
            <div className="font-medium text-white">{getDateRangeLabel()}</div>
            <div className="text-gray-400">•</div>
            <div className="font-medium text-blue-400">{tasks.length} tasks</div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Total Tasks</div>
              <div className="text-3xl font-bold text-white">{statistics.total}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Pending</div>
              <div className="text-3xl font-bold text-blue-400">{statistics.pending}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Completed</div>
              <div className="text-3xl font-bold text-green-400">{statistics.completed}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-red-500/50 bg-red-900/10">
              <div className="text-gray-400 text-sm mb-1">Overdue</div>
              <div className="text-3xl font-bold text-red-400">{statistics.overdue}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <div className="flex flex-wrap gap-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task List - Grouped by Meeting */}
          {groupedTasks.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No tasks found</h2>
              <p className="text-gray-400">
                {statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Tasks created from meeting reports will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTasks.map((group) => (
                <MeetingTaskGroup
                  key={group.meeting.meeting_id}
                  meeting={group.meeting}
                  tasks={group.tasks}
                  pendingCount={group.pendingCount}
                  completedCount={group.completedCount}
                  overdueCount={group.overdueCount}
                  allCompleted={group.allCompleted}
                  onTaskToggle={toggleTaskStatus}
                  onTaskEdit={editTask}
                  onTaskDelete={deleteTask}
                  isTeamView={isTeamView}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onOpenModal={() => setIsQuickCreateModalOpen(true)} />

      {/* Quick Create Modal */}
      <QuickCreateModal
        isOpen={isQuickCreateModalOpen}
        onClose={() => setIsQuickCreateModalOpen(false)}
      />
    </MeetingTrackerSidebar>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
