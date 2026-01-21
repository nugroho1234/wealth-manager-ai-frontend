'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import TeamFilter from '@/components/meeting-tracker/TeamFilter';
import UpcomingEvents from '@/components/meeting-tracker/UpcomingEvents';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Type definitions
interface DashboardStats {
  total_meetings: number;
  pending_reports: number;
  completed_count: number;
  sales_count: number;
  recruitment_count: number;
  new_count: number;
}

type DateRangeFilter = 'this_month' | 'last_7_days' | 'last_30_days' | 'this_week' | 'last_month' | 'this_year' | 'last_year' | 'custom' | 'all_time';

interface Meeting {
  meeting_id: string;
  title: string;
  category: 'R' | 'N' | 'S';
  start_time: string;
  end_time: string;
  has_report: boolean;
}

function DashboardContent() {
  const { user } = useAuth();
  const [teamFilter, setTeamFilter] = useState<string>('me');
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
  }, [teamFilter]);

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
    setLoading(true);

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
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const meetingsList = data.meetings || [];
        setMeetings(meetingsList);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
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
    localStorage.setItem('meeting_date_range', range);
  };

  // Apply date filter
  const dateFilteredMeetings = meetings.filter((meeting) => {
    const { start, end } = getDateRange();

    // If no date range (all_time or invalid custom), show all
    if (!start || !end) return true;

    const meetingDate = new Date(meeting.start_time);
    return meetingDate >= start && meetingDate <= end;
  });

  // Calculate view_type for UpcomingEvents component
  const viewType = teamFilter === 'me' ? 'my_data' :
                   teamFilter === 'team' ? 'my_team' :
                   `subordinate_${teamFilter}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="mt-2 text-sm text-gray-400">
            Track your meetings, performance, and team activities at a glance
          </p>
        </div>

        {/* Filters Row: Team Filter + Date Range */}
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
          <div className="font-medium text-blue-400">{stats.total_meetings} meetings</div>
        </div>

        {/* Dashboard Components */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Performance Funnel */}
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Performance Funnel</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="bg-blue-600 text-white rounded-lg p-4 mb-2">
                      <div className="text-3xl font-bold">{stats.total_meetings}</div>
                    </div>
                    <div className="text-sm text-gray-300">Total Meetings</div>
                  </div>
                  <div className="flex items-center justify-center text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="bg-yellow-600 text-white rounded-lg p-4 mb-2">
                      <div className="text-3xl font-bold">{stats.pending_reports}</div>
                    </div>
                    <div className="text-sm text-gray-300">Pending Forms</div>
                  </div>
                  <div className="flex items-center justify-center text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-600 text-white rounded-lg p-4 mb-2">
                      <div className="text-3xl font-bold">{stats.completed_count || 0}</div>
                    </div>
                    <div className="text-sm text-gray-300">Completed</div>
                  </div>
                </div>
              </div>

              {/* Meeting Statistics */}
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Meeting Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Sales</div>
                      <div className="text-2xl">💼</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.sales_count}</div>
                    <div className="text-sm text-blue-200">meetings</div>
                  </div>

                  <div className="bg-green-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Recruitment</div>
                      <div className="text-2xl">👥</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.recruitment_count}</div>
                    <div className="text-sm text-green-200">meetings</div>
                  </div>

                  <div className="bg-purple-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">New</div>
                      <div className="text-2xl">✨</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.new_count}</div>
                    <div className="text-sm text-purple-200">meetings</div>
                  </div>
                </div>
              </div>

              {/* Upcoming Events */}
              <UpcomingEvents viewType={viewType} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeetingTrackerOverview() {
  return (
    <ProtectedRoute>
      <MeetingTrackerSidebar>
        <DashboardContent />
      </MeetingTrackerSidebar>
    </ProtectedRoute>
  );
}
