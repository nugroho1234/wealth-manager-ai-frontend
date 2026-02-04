'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGamification, type GamificationStats } from '@/contexts/GamificationContext';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  unlocked_at: string;
}

/**
 * GamificationSidebarWidget Component
 * Compact version for sidebar - shows progress with minimal space
 */
export default function GamificationSidebarWidget() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topBadges, setTopBadges] = useState<Badge[]>([]);
  const { refreshTrigger, latestStats } = useGamification();

  useEffect(() => {
    // console.log('[GamificationSidebarWidget] useEffect triggered. refreshTrigger:', refreshTrigger, 'latestStats:', latestStats);
    // If we have latestStats from context, use them immediately (no API call)
    if (latestStats) {
      // console.log('[GamificationSidebarWidget] Using latestStats from context:', latestStats);
      setStats(latestStats);
      setLoading(false);
    } else {
      // console.log('[GamificationSidebarWidget] No latestStats, fetching from API');
      // Otherwise fetch from API
      fetchGamificationStats();
    }

    // Fetch top 3 badges
    fetchTopBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]); // Only depend on refreshTrigger to avoid infinite loops

  const fetchGamificationStats = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
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
      }
    } catch (err) {
      console.error('Error fetching gamification stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopBadges = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;

      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/badges?limit=3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopBadges(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching top badges:', err);
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
      <div className="p-4 border-t border-gray-700">
        <div className="animate-pulse">
          <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-700 rounded w-full mb-1"></div>
          <div className="h-2 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null; // Don't show widget if there's an error
  }

  return (
    <div className="p-4 border-t border-gray-700">
      {/* Header with link to full page */}
      <Link
        href="/meeting-tracker/achievements"
        className="block mb-3 group"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
            Your Progress
          </h3>
          <span className="text-xs text-blue-400 group-hover:text-blue-300">→</span>
        </div>
      </Link>

      {/* Lifetime Level - Compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{stats.level_icon}</span>
            <span className="text-xs font-medium text-gray-300">
              Level {stats.level}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(lifetimeProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${lifetimeProgress}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {stats.lifetime_xp.toLocaleString()} XP
        </div>
      </div>

      {/* Annual Tier - Compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{stats.tier_icon}</span>
            <span className="text-xs font-medium text-gray-300">
              {stats.tier_name}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(annualProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${annualProgress}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {stats.current_year_xp.toLocaleString()} XP ({stats.current_year})
        </div>
      </div>

      {/* Streak & Rank - Single Line */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-700">
        <div className="flex items-center gap-1">
          <span>{stats.current_streak > 0 ? '🔥' : '❄️'}</span>
          <span className="text-gray-400">{stats.current_streak}d</span>
        </div>
        {stats.current_rank > 0 && (
          <div className="flex items-center gap-1">
            <span>📊</span>
            <span className="text-gray-400">#{stats.current_rank}</span>
          </div>
        )}
      </div>

      {/* Latest Badges - Top 3 */}
      {topBadges.length > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Latest Badges</span>
            <Link href="/meeting-tracker/achievements" className="text-xs text-blue-400 hover:text-blue-300">
              View All →
            </Link>
          </div>
          <div className="flex items-center justify-center gap-2">
            {topBadges.map((badge) => (
              <div
                key={badge.badge_id}
                className="group relative"
                title={badge.name}
              >
                <span className="text-2xl cursor-pointer transform transition-transform hover:scale-110">
                  {badge.icon}
                </span>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                    {badge.name}
                    <div className="text-gray-400 text-xs">{badge.rarity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
