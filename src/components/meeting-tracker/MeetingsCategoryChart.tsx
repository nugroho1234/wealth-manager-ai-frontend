'use client';

import { useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';

// Type definitions
interface Meeting {
  id: string;
  meeting_type: 'S' | 'R' | 'N' | 'U';
  person_name?: string;
  meeting_title: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface MeetingsCategoryChartProps {
  meetings: Meeting[];
  selectedCategory: 'all' | 'S' | 'R' | 'N';
  onCategorySelect: (category: 'all' | 'S' | 'R' | 'N') => void;
  loading?: boolean;
}

// Color scheme based on requirements
const CATEGORY_COLORS = {
  all: {
    normal: '#9CA3AF',      // Gray-400
    active: '#F3F4F6',      // Gray-100
    border: '#E5E7EB',      // Gray-200
  },
  S: { // Sales
    normal: '#3B82F6',      // Blue-500
    active: '#60A5FA',      // Blue-400
    border: '#93C5FD',      // Blue-300
  },
  R: { // Recruitment
    normal: '#10B981',      // Green-500
    active: '#34D399',      // Green-400
    border: '#6EE7B7',      // Green-300
  },
  N: { // New
    normal: '#A855F7',      // Purple-500
    active: '#C084FC',      // Purple-400
    border: '#D8B4FE',      // Purple-300
  },
};

type CategoryKey = 'all' | 'S' | 'R' | 'N';

interface ChartDataItem {
  name: string;
  category: CategoryKey;
  count: number;
  label: string;
}

/**
 * MeetingsCategoryChart Component
 *
 * Displays a horizontal bar chart showing meeting counts by category.
 * Uses recharts library for visualization.
 *
 * Categories:
 * - All: Total meetings (Gray/White)
 * - Sales (S): Blue (#3B82F6)
 * - Recruitment (R): Green (#10B981)
 * - New (N): Purple (#A855F7)
 *
 * Features:
 * - Clickable bars to filter meetings
 * - Active state: Brighter color + border
 * - 0-count bars visible but unclickable
 */
export default function MeetingsCategoryChart({
  meetings,
  selectedCategory,
  onCategorySelect,
  loading = false,
}: MeetingsCategoryChartProps) {
  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const total = meetings.length;
    const sales = meetings.filter(m => m.meeting_type === 'S').length;
    const recruitment = meetings.filter(m => m.meeting_type === 'R').length;
    const newMeetings = meetings.filter(m => m.meeting_type === 'N').length;

    return {
      all: total,
      S: sales,
      R: recruitment,
      N: newMeetings,
    };
  }, [meetings]);

  // Prepare chart data
  const chartData: ChartDataItem[] = useMemo(() => [
    { name: 'All', category: 'all' as CategoryKey, count: categoryCounts.all, label: `All (${categoryCounts.all})` },
    { name: 'Sales', category: 'S' as CategoryKey, count: categoryCounts.S, label: `Sales (${categoryCounts.S})` },
    { name: 'Recruitment', category: 'R' as CategoryKey, count: categoryCounts.R, label: `Recruitment (${categoryCounts.R})` },
    { name: 'New', category: 'N' as CategoryKey, count: categoryCounts.N, label: `New (${categoryCounts.N})` },
  ], [categoryCounts]);

  // Handle bar click
  const handleBarClick = useCallback((data: ChartDataItem) => {
    // Don't allow clicking on 0-count bars
    if (data.count === 0) return;

    onCategorySelect(data.category);
  }, [onCategorySelect]);

  // Get bar color based on active state
  const getBarColor = useCallback((category: CategoryKey, count: number) => {
    const isActive = category === selectedCategory;
    const colors = CATEGORY_COLORS[category];

    // If 0 count, show faded normal color
    if (count === 0) {
      return colors.normal + '40'; // Add opacity
    }

    return isActive ? colors.active : colors.normal;
  }, [selectedCategory]);

  // Get cursor style
  const getCursor = useCallback((count: number) => {
    return count > 0 ? 'pointer' : 'default';
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Meetings Category Chart">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-700 rounded w-8"></div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6" role="region" aria-label="Meetings Category Chart">
      {/* Chart */}
      <div className="space-y-3">
        {chartData.map((item) => {
          const isActive = item.category === selectedCategory;
          const isClickable = item.count > 0;
          const colors = CATEGORY_COLORS[item.category];

          return (
            <div
              key={item.category}
              onClick={() => isClickable && handleBarClick(item)}
              className={`
                relative rounded-lg p-3 transition-all
                ${isClickable ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'}
                ${isActive ? 'bg-gray-700 border-2' : 'bg-gray-750 border-2 border-transparent'}
              `}
              style={isActive ? { borderColor: colors.border } : {}}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              aria-label={`${item.name}: ${item.count} meetings${isActive ? ' (selected)' : ''}`}
              aria-disabled={!isClickable}
              onKeyPress={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleBarClick(item);
                }
              }}
            >
              {/* Label and Count */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {item.name}
                </span>
                <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {item.count}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.count === 0 ? 5 : Math.min((item.count / Math.max(...chartData.map(d => d.count))) * 100, 100)}%`,
                    backgroundColor: getBarColor(item.category, item.count),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
