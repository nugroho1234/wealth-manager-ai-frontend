'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGamification, type GamificationStats } from '@/contexts/GamificationContext';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * GamificationWidget Component
 * Displays user's gamification progress in the dashboard sidebar
 * Shows both lifetime level and annual tier with progress bars
 */
export default function GamificationWidget() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshTrigger, latestStats } = useGamification();

  useEffect(() => {
    console.log('[GamificationWidget] useEffect triggered. refreshTrigger:', refreshTrigger, 'latestStats:', latestStats);
    // If we have latestStats from context, use them immediately (no API call)
    if (latestStats) {
      console.log('[GamificationWidget] Using latestStats from context:', latestStats);
      setStats(latestStats);
      setLoading(false);
    } else {
      console.log('[GamificationWidget] No latestStats, fetching from API');
      // Otherwise fetch from API
      fetchGamificationStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]); // Only depend on refreshTrigger to avoid infinite loops

  const fetchGamificationStats = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gamification stats');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setStats(data.data);
      } else {
        setError('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching gamification stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress percentages
  const lifetimeProgress = stats
    ? stats.xp_to_next_level > 0
      ? (stats.lifetime_xp / (stats.lifetime_xp + stats.xp_to_next_level)) * 100
      : 100
    : 0;

  const annualProgress = stats
    ? stats.xp_to_next_tier > 0
      ? (stats.current_year_xp / (stats.current_year_xp + stats.xp_to_next_tier)) * 100
      : 100
    : 0;

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null; // Don't show widget if there's an error
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Your Progress</h3>
        <Link
          href="/meeting-tracker/achievements"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Lifetime Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stats.level_icon}</span>
            <div>
              <div className="text-xs text-gray-400">Lifetime Level</div>
              <div className="text-sm font-medium text-gray-200">
                Level {stats.level}: {stats.level_name}
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${lifetimeProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">
            {stats.lifetime_xp.toLocaleString()} / {(stats.lifetime_xp + stats.xp_to_next_level).toLocaleString()} XP
            {stats.xp_to_next_level > 0 && (
              <span className="text-gray-500"> ({stats.xp_to_next_level.toLocaleString()} to next)</span>
            )}
          </div>
        </div>
      </div>

      {/* Annual Tier */}
      <div className="space-y-2 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stats.tier_icon}</span>
            <div>
              <div className="text-xs text-gray-400">Annual {stats.current_year}</div>
              <div className="text-sm font-medium text-gray-200">
                {stats.tier_name} Tier
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${annualProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">
            {stats.current_year_xp.toLocaleString()} / {(stats.current_year_xp + stats.xp_to_next_tier).toLocaleString()} XP
            {stats.xp_to_next_tier > 0 && (
              <span className="text-gray-500"> ({stats.xp_to_next_tier.toLocaleString()} to next)</span>
            )}
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="pt-2 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">{stats.current_streak > 0 ? '🔥' : '❄️'}</span>
          <div>
            <div className="text-xs text-gray-400">Current Streak</div>
            <div className="text-sm font-medium text-gray-200">
              {stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </div>

      {/* Company Rank */}
      {stats.current_rank > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <div className="text-xs text-gray-400">Company Rank</div>
              <div className="text-sm font-medium text-gray-200">
                #{stats.current_rank}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
