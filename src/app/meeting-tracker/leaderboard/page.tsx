'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Type definitions
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  first_name: string;
  last_name: string;
  xp: number;
  level?: number;
  annual_tier?: string;
  is_current_user: boolean;
}

type Period = 'annual' | 'all_time' | 'monthly' | 'weekly';

/**
 * Leaderboard Page Content
 * Shows company rankings with multiple time period filters:
 * - Annual (current year XP)
 * - All Time (lifetime XP)
 * - Monthly (current month XP)
 * - Weekly (current week XP)
 */
function LeaderboardContent() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>('annual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/gamification/leaderboard?period=${period}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setEntries(data.data.entries);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Get tier icon
  const getTierIcon = (tier: string | undefined) => {
    if (!tier) return '';
    const tierIcons: Record<string, string> = {
      'bronze': '🥉',
      'silver': '🥈',
      'gold': '🥇',
      'platinum': '💎',
    };
    return tierIcons[tier] || '';
  };

  // Get level icon
  const getLevelIcon = (level: number | undefined) => {
    if (!level) return '';
    const levelIcons = ['🌱', '⭐', '💫', '🏅', '👑'];
    return levelIcons[level - 1] || '🌱';
  };

  // Get medal for top 3
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // Get period display name
  const getPeriodName = (p: Period) => {
    const names: Record<Period, string> = {
      'annual': 'This Year',
      'all_time': 'All Time',
      'monthly': 'This Month',
      'weekly': 'This Week',
    };
    return names[p];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Leaderboard</h1>
            <p className="text-gray-400 mt-1">Company rankings and top performers</p>
          </div>
          <Link
            href="/meeting-tracker/achievements"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Your Achievements
          </Link>
        </div>

        {/* Period Filter Tabs */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
          <div className="grid grid-cols-4 gap-2">
            {(['annual', 'all_time', 'monthly', 'weekly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-4 py-3 rounded-md font-medium text-sm transition-colors
                  ${period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-750 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                  }
                `}
              >
                {getPeriodName(p)}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-750 px-6 py-4 border-b border-gray-700">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-3">
                {period === 'annual' ? 'Tier' : 'Level'}
              </div>
              <div className="col-span-3 text-right">XP</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-700">
            {loading ? (
              // Loading skeleton
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="h-4 w-8 bg-gray-700 rounded"></div>
                    <div className="h-4 flex-1 bg-gray-700 rounded"></div>
                    <div className="h-4 w-20 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              // Error state
              <div className="p-12 text-center">
                <div className="text-red-400 mb-2">Failed to load leaderboard</div>
                <button
                  onClick={fetchLeaderboard}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Try again
                </button>
              </div>
            ) : entries.length === 0 ? (
              // Empty state
              <div className="p-12 text-center text-gray-400">
                <span className="text-4xl mb-3 block">📊</span>
                <p>No leaderboard data available yet</p>
              </div>
            ) : (
              // Leaderboard entries
              entries.map((entry) => {
                const medal = getMedalIcon(entry.rank);
                const isCurrentUser = entry.is_current_user;

                return (
                  <div
                    key={entry.user_id}
                    className={`
                      px-6 py-4 transition-colors
                      ${isCurrentUser
                        ? 'bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-750'
                      }
                    `}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Rank */}
                      <div className="col-span-1">
                        <div className="flex items-center gap-2">
                          {medal ? (
                            <span className="text-2xl">{medal}</span>
                          ) : (
                            <span className={`
                              text-lg font-bold
                              ${isCurrentUser ? 'text-blue-400' : 'text-gray-500'}
                            `}>
                              #{entry.rank}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
                          <span className={`
                            font-medium
                            ${isCurrentUser ? 'text-blue-300' : 'text-gray-200'}
                          `}>
                            {entry.first_name} {entry.last_name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tier or Level */}
                      <div className="col-span-3">
                        {period === 'annual' && entry.annual_tier ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTierIcon(entry.annual_tier)}</span>
                            <span className="text-sm text-gray-300 capitalize">
                              {entry.annual_tier}
                            </span>
                          </div>
                        ) : period === 'all_time' && entry.level ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getLevelIcon(entry.level)}</span>
                            <span className="text-sm text-gray-300">
                              Level {entry.level}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </div>

                      {/* XP */}
                      <div className="col-span-3 text-right">
                        <span className={`
                          text-lg font-semibold
                          ${isCurrentUser ? 'text-blue-400' : 'text-gray-300'}
                        `}>
                          {entry.xp.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">XP</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-gray-400">
              <p className="font-medium text-gray-300 mb-1">How to climb the leaderboard:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Submit meeting reports regularly to maintain your streak</li>
                <li>Complete high-priority tasks for bonus XP</li>
                <li>Submit reports within 24 hours for fast completion bonuses</li>
                <li>Maintain a perfect week (all meetings reported) for extra points</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <MeetingTrackerSidebar>
        <LeaderboardContent />
      </MeetingTrackerSidebar>
    </ProtectedRoute>
  );
}
