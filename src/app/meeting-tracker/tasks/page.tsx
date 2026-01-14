'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
}

interface Statistics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

function TasksContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Completed tasks visibility
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

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

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
            <p className="text-gray-400">Manage your meeting tasks and action items</p>
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
                    >
                      {task.status === 'completed' ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-blue-400 transition-colors"></div>
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {task.task_description || task.title}
                        </h3>
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
                                  >
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </button>

                                  {/* Task Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <h3 className="text-lg font-medium text-gray-400">
                                        {task.task_description || task.title}
                                      </h3>
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
