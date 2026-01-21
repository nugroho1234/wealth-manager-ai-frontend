'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import TeamFilter from '@/components/meeting-tracker/TeamFilter';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Meeting {
  meeting_id: string;
  title: string;
  category: 'R' | 'N' | 'S';
  start_time: string;
  end_time: string;
  description?: string;
  needs_review: boolean;
  confidence: string;
  has_report: boolean;
  draft_saved: boolean;
  user?: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface DashboardStats {
  total_meetings: number;
  pending_reports: number;
  completed_count: number;
  sales_count: number;
  recruitment_count: number;
  new_count: number;
}

type DateRangeFilter = 'this_month' | 'last_7_days' | 'last_30_days' | 'this_week' | 'last_month' | 'this_year' | 'last_year' | 'custom' | 'all_time';

function DashboardContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_meetings: 0,
    pending_reports: 0,
    completed_count: 0,
    sales_count: 0,
    recruitment_count: 0,
    new_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'R' | 'N' | 'S'>('all');

  // Team filter state
  const [teamFilter, setTeamFilter] = useState<string>('me');

  // Date filter state
  const [dateRange, setDateRange] = useState<DateRangeFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Load date filter preference from localStorage on mount
  useEffect(() => {
    const savedDateRange = localStorage.getItem('meeting_date_range');
    if (savedDateRange) {
      setDateRange(savedDateRange as DateRangeFilter);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [teamFilter]); // Refetch when team filter changes

  // Recalculate stats when meetings or date filter changes
  useEffect(() => {
    if (meetings.length === 0) return;

    const now = new Date();
    const filtered = dateFilteredMeetings;

    const totalMeetings = filtered.length;
    const pendingReports = filtered.filter((m: Meeting) => !m.has_report).length;
    const completedCount = filtered.filter((m: Meeting) => new Date(m.end_time) < now).length;
    const salesCount = filtered.filter((m: Meeting) => m.category === 'S').length;
    const recruitmentCount = filtered.filter((m: Meeting) => m.category === 'R').length;
    const newCount = filtered.filter((m: Meeting) => m.category === 'N').length;

    setStats({
      total_meetings: totalMeetings,
      pending_reports: pendingReports,
      completed_count: completedCount,
      sales_count: salesCount,
      recruitment_count: recruitmentCount,
      new_count: newCount,
    });
  }, [meetings, dateRange, customStartDate, customEndDate]);

  const fetchDashboardData = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Build query string with team filter
      const params = new URLSearchParams();
      if (teamFilter && teamFilter !== 'me') {
        params.append('team_filter', teamFilter);
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/v1/meeting-tracker/meetings${queryString ? `?${queryString}` : ''}`;

      // Fetch meetings
      const meetingsRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meetingsRes.ok) throw new Error('Failed to fetch meetings');

      const meetingsData = await meetingsRes.json();
      const meetingsList = meetingsData.meetings || [];

      setMeetings(meetingsList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'R':
        return 'Recruitment';
      case 'N':
        return 'New';
      case 'S':
        return 'Sales';
      default:
        return 'Unknown';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'R':
        return 'bg-green-500';
      case 'N':
        return 'bg-purple-500';
      case 'S':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
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
    localStorage.setItem('meeting_date_range', range);
  };

  // Apply date filter first, then category filter
  const dateFilteredMeetings = meetings.filter((meeting) => {
    const { start, end } = getDateRange();

    // If no date range (all_time or invalid custom), show all
    if (!start || !end) return true;

    const meetingDate = new Date(meeting.start_time);
    return meetingDate >= start && meetingDate <= end;
  });

  const filteredMeetings =
    selectedCategory === 'all'
      ? dateFilteredMeetings
      : dateFilteredMeetings.filter((m) => m.category === selectedCategory);

  const groupedMeetings = {
    S: filteredMeetings.filter((m) => m.category === 'S'),
    R: filteredMeetings.filter((m) => m.category === 'R'),
    N: filteredMeetings.filter((m) => m.category === 'N'),
  };

  if (!user) return null;

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 text-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
            <p className="text-gray-400">Track your meetings and performance</p>
          </div>

          {/* Filters Row: Team Filter + Date Range (side by side for leaders) */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Team Filter (only shows for leaders) */}
              <TeamFilter
                value={teamFilter}
                onChange={setTeamFilter}
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
            <div className="font-medium text-blue-400">{filteredMeetings.length} meetings</div>
          </div>

          {/* Performance Funnel */}
          <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Performance Funnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="bg-blue-600 rounded-lg p-4 mb-2">
                  <div className="text-3xl font-bold">{stats.total_meetings}</div>
                </div>
                <div className="text-sm text-gray-400">Total Meetings</div>
              </div>
              <div className="flex items-center justify-center text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-center">
                <div className="bg-yellow-600 rounded-lg p-4 mb-2">
                  <div className="text-3xl font-bold">{stats.pending_reports}</div>
                </div>
                <div className="text-sm text-gray-400">Pending Forms</div>
              </div>
              <div className="flex items-center justify-center text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-center">
                <div className="bg-green-600 rounded-lg p-4 mb-2">
                  <div className="text-3xl font-bold">
                    {stats.completed_count || 0}
                  </div>
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          {/* Category Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-600 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Sales</div>
                <div className="text-2xl">💼</div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.sales_count}</div>
              <div className="text-sm text-blue-200">meetings</div>
            </div>

            <div className="bg-green-600 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Recruitment</div>
                <div className="text-2xl">👥</div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.recruitment_count}</div>
              <div className="text-sm text-green-200">meetings</div>
            </div>

            <div className="bg-purple-600 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">New</div>
                <div className="text-2xl">✨</div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.new_count}</div>
              <div className="text-sm text-purple-200">meetings</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All Meetings
            </button>
            <button
              onClick={() => setSelectedCategory('S')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'S'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Sales ({stats.sales_count})
            </button>
            <button
              onClick={() => setSelectedCategory('R')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'R'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Recruitment ({stats.recruitment_count})
            </button>
            <button
              onClick={() => setSelectedCategory('N')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'N'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              New ({stats.new_count})
            </button>
          </div>

          {/* Meetings List by Category */}
          <div className="space-y-8">
            {(['S', 'R', 'N'] as const).map((category) => {
              const categoryMeetings = groupedMeetings[category];

              // When filtering by specific category, only show that category
              if (selectedCategory !== 'all' && category !== selectedCategory) return null;

              // Don't show empty categories when viewing all
              if (categoryMeetings.length === 0 && selectedCategory === 'all') return null;

              // Show empty state only for the filtered category
              if (categoryMeetings.length === 0 && selectedCategory !== 'all') {
                return (
                  <div key={category} className="bg-gray-800 rounded-xl p-8 text-center">
                    <div className="text-gray-400">No {getCategoryLabel(category)} meetings found</div>
                  </div>
                );
              }

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold uppercase tracking-wide">
                      {getCategoryLabel(category)} Meetings ({categoryMeetings.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryMeetings.map((meeting) => {
                      // Check if we're viewing team data (not 'me')
                      const isTeamView = teamFilter !== 'me';
                      const subordinateName = meeting.user
                        ? `${meeting.user.first_name} ${meeting.user.last_name}`.trim()
                        : 'Unknown User';

                      return (
                        <div
                          key={meeting.meeting_id}
                          className="bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-700 hover:border-gray-600"
                        >
                          {/* Subordinate Name (only in team view) */}
                          {isTeamView && (
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-700">
                              <span className="text-lg">👤</span>
                              <span className="text-sm font-semibold text-blue-400">{subordinateName}</span>
                            </div>
                          )}

                          {/* Meeting Time */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🕐</span>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {format(new Date(meeting.start_time), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-gray-400">
                                  {format(new Date(meeting.start_time), 'HH:mm')} -{' '}
                                  {format(new Date(meeting.end_time), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                            <span className={`w-3 h-3 rounded-full ${getCategoryColor(meeting.category)}`}></span>
                          </div>

                          {/* Meeting Title */}
                          <h3 className="text-lg font-semibold mb-2">{meeting.title}</h3>

                          {/* Description */}
                          {meeting.description && (
                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{meeting.description}</p>
                          )}

                          {/* Badges */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(meeting.category)} bg-opacity-20 border border-current`}>
                              {getCategoryLabel(meeting.category)}
                            </span>
                            {/* Show "Report Pending" badge in team view when no report */}
                            {isTeamView && !meeting.has_report && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 bg-opacity-20 border border-yellow-500 text-yellow-400">
                                ⚠️ Report Pending
                              </span>
                            )}
                            {/* Show "No Report" badge in my data view when no report */}
                            {!isTeamView && !meeting.has_report && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 bg-opacity-20 border border-yellow-500 text-yellow-400">
                                No Report
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {(() => {
                            const meetingEndTime = new Date(meeting.end_time);
                            const currentTime = new Date();
                            const isCompleted = meetingEndTime < currentTime;

                            // Team View Logic:
                            // - has_report == TRUE → "View Report" (read-only, green)
                            // - has_report == FALSE → No button (just show "Report Pending" badge)
                            //
                            // My Data View Logic:
                            // - has_report == TRUE → "View Report" (read-only, green)
                            // - has_report == FALSE && draft_saved == TRUE → "Continue Draft" (editable, yellow)
                            // - Otherwise → "Fill Report" (new, blue)

                            if (isTeamView) {
                              // Team view: only show "View Report" button if report exists
                              if (meeting.has_report) {
                                return isCompleted ? (
                                  <div className="flex gap-2">
                                    <a
                                      href={`/meeting-tracker/form/${meeting.meeting_id}`}
                                      className="flex-1 text-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      View Report
                                    </a>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <div className="flex-1 text-center px-4 py-2 bg-gray-700 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                                      Upcoming Meeting
                                    </div>
                                  </div>
                                );
                              } else {
                                // No report yet - don't show button, just the badge above
                                return isCompleted ? (
                                  <div className="flex gap-2">
                                    <div className="flex-1 text-center px-4 py-2 bg-gray-700 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                                      Report Not Submitted
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <div className="flex-1 text-center px-4 py-2 bg-gray-700 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                                      Upcoming Meeting
                                    </div>
                                  </div>
                                );
                              }
                            } else {
                              // My data view: show appropriate button based on report state
                              let buttonText = 'Fill Report';
                              let buttonColor = 'bg-blue-600 hover:bg-blue-700';

                              if (meeting.has_report) {
                                buttonText = 'View Report';
                                buttonColor = 'bg-green-600 hover:bg-green-700';
                              } else if (meeting.draft_saved) {
                                buttonText = 'Continue Draft';
                                buttonColor = 'bg-yellow-600 hover:bg-yellow-700';
                              }

                              return isCompleted ? (
                                <div className="flex gap-2">
                                  <a
                                    href={`/meeting-tracker/form/${meeting.meeting_id}`}
                                    className={`flex-1 text-center px-4 py-2 ${buttonColor} rounded-lg text-sm font-medium transition-colors`}
                                  >
                                    {buttonText}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <div className="flex-1 text-center px-4 py-2 bg-gray-700 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                                    Upcoming Meeting
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {meetings.length === 0 && (
            <div className="bg-gray-800 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-semibold mb-2">No Meetings Yet</h2>
              <p className="text-gray-400 mb-6">
                Your meetings will appear here once they're synced from Google Calendar.
              </p>
              <a
                href="/meeting-tracker/settings"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Go to Settings
              </a>
            </div>
          )}
        </main>
      </div>
    </MeetingTrackerSidebar>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
