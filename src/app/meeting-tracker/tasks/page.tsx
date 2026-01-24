'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import TeamFilter from '@/components/meeting-tracker/TeamFilter';
import ViewContextBanner from '@/components/meeting-tracker/ViewContextBanner';
import FloatingActionButton from '@/components/meeting-tracker/FloatingActionButton';
import QuickCreateModal from '@/components/meeting-tracker/QuickCreateModal';
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

function TasksContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
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

  // Completed tasks visibility
  const [showCompleted, setShowCompleted] = useState(false);

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
      setTasks(data.tasks || []);
      setStatistics(data.statistics || { total: 0, completed: 0, pending: 0, overdue: 0 });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
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

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return 'Overdue';
    return format(date, 'MMM d, yyyy');
  };

  const isOverdue = (dateString: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') return false;
    return isPast(parseISO(dateString)) && !isToday(parseISO(dateString));
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

          {/* Task List */}
          {tasks.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No tasks found</h2>
              <p className="text-gray-400">
                {statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Tasks created from meeting reports will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Tasks */}
              {(() => {
                const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
                const completedTasks = tasks.filter(t => t.status === 'completed');

                return (
                  <>
                    {activeTasks.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Active Tasks ({activeTasks.length})</h3>
                        {activeTasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`bg-gray-800 rounded-xl p-6 border transition-all hover:border-gray-600 ${
                    isOverdue(task.due_date, task.status)
                      ? 'border-red-500/50 bg-red-900/10'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTaskStatus(task.task_id, task.status)}
                      className="mt-1 flex-shrink-0"
                      disabled={isTeamView}
                      title={isTeamView ? "Cannot toggle subordinate's task status" : "Toggle task status"}
                    >
                      {task.status === 'completed' ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 ${isTeamView ? 'border-gray-600 cursor-not-allowed' : 'border-gray-500 hover:border-blue-400'} transition-colors`}></div>
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      {/* User Name (team view only) */}
                      {isTeamView && task.users && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                          <span className="text-lg">👤</span>
                          <span className="text-sm font-semibold text-blue-400">
                            {task.users.first_name} {task.users.last_name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {task.task_description || task.title}
                        </h3>
                        {!isTeamView && (
                          <button
                            onClick={() => deleteTask(task.task_id)}
                            className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {/* Priority Badge */}
                        {task.priority && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        )}

                        {/* Due Date */}
                        <span
                          className={`flex items-center gap-1 text-sm ${
                            isOverdue(task.due_date, task.status)
                              ? 'text-red-400 font-semibold'
                              : isToday(parseISO(task.due_date))
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {getDateLabel(task.due_date)}
                        </span>
                      </div>

                      {/* Related Meeting */}
                      {task.meetings && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>From: {task.meetings.title}</span>
                          {task.meetings.category && (
                            <span className="px-2 py-0.5 rounded bg-gray-700 text-xs">
                              {task.meetings.category}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                      </div>
                    )}

                    {/* Completed Tasks - Collapsible */}
                    {completedTasks.length > 0 && (
                      <div className="space-y-4">
                        <button
                          onClick={() => setShowCompleted(!showCompleted)}
                          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-gray-300 transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Completed Tasks ({completedTasks.length})
                        </button>

                        {showCompleted && (
                          <div className="space-y-4">
                            {completedTasks.map((task) => (
                              <div
                                key={task.task_id}
                                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
                              >
                                <div className="flex items-start gap-4">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleTaskStatus(task.task_id, task.status)}
                                    className="mt-1 flex-shrink-0"
                                    disabled={isTeamView}
                                    title={isTeamView ? "Cannot toggle subordinate's task status" : "Toggle task status"}
                                  >
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </button>

                                  {/* Task Content */}
                                  <div className="flex-1 min-w-0">
                                    {/* User Name (team view only) */}
                                    {isTeamView && task.users && (
                                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700/50">
                                        <span className="text-lg">👤</span>
                                        <span className="text-sm font-semibold text-blue-400/70">
                                          {task.users.first_name} {task.users.last_name}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <h3 className="text-lg font-medium text-gray-400">
                                        {task.task_description || task.title}
                                      </h3>
                                      {!isTeamView && (
                                        <button
                                          onClick={() => deleteTask(task.task_id)}
                                          className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                      {/* Priority Badge */}
                                      {task.priority && (
                                        <span className="px-2 py-1 rounded bg-gray-700/50 text-xs">
                                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                        </span>
                                      )}

                                      {/* Completed At */}
                                      {task.completed_at && (
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          Completed at {format(parseISO(task.completed_at), 'MMM d, yyyy h:mm a')}
                                        </span>
                                      )}
                                    </div>

                                    {/* Related Meeting */}
                                    {task.meetings && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <span>From: {task.meetings.title}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
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
