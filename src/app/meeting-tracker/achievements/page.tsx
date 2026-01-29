'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Type definitions
interface GamificationStats {
  user_id: string;
  lifetime_xp: number;
  level: number;
  level_name: string;
  level_icon: string;
  xp_to_next_level: number;
  current_year_xp: number;
  current_year: number;
  annual_tier: string;
  tier_name: string;
  tier_icon: string;
  xp_to_next_tier: number;
  current_streak: number;
  longest_streak: number;
  reports_submitted: number;
  tasks_completed: number;
  current_rank: number;
}

interface Transaction {
  transaction_id: string;
  points: number;
  action_type: string;
  description: string | null;
  created_at: string;
}

interface BadgeWithProgress {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  earned: boolean;
  unlocked_at: string | null;
  progress: number;
  progress_text: string;
}

/**
 * Achievements Page Content
 * Full gamification dashboard showing:
 * - Lifetime level progress
 * - Annual tier progress
 * - Engagement stats (streaks, reports, tasks)
 * - Badges (earned and in-progress)
 * - Recent transaction history
 */
function AchievementsContent() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchData();
    fetchBadges();
  }, []);

  const fetchData = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      // Fetch stats and transactions in parallel
      const [statsResponse, transactionsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/gamification/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/gamification/transactions?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!statsResponse.ok || !transactionsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const statsData = await statsResponse.json();
      const transactionsData = await transactionsResponse.json();

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }

      if (transactionsData.success && transactionsData.data) {
        setTransactions(transactionsData.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching gamification data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        setBadgesLoading(false);
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/badges/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBadges(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching badges:', err);
    } finally {
      setBadgesLoading(false);
    }
  };

  const claimEarnedBadges = async () => {
    setClaiming(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        alert('Please log in to claim badges');
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/_retroactive_badges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const badgesAwarded = data.data?.badges_awarded || [];
        const count = data.data?.count || 0;

        if (count > 0) {
          alert(`Success! ${count} badge${count !== 1 ? 's' : ''} awarded!`);
          // Refresh badges
          await fetchBadges();
        } else {
          alert('No new badges to claim. You already have all eligible badges!');
        }
      } else {
        alert('Failed to claim badges. Please try again later.');
      }
    } catch (err) {
      console.error('Error claiming badges:', err);
      alert('An error occurred while claiming badges.');
    } finally {
      setClaiming(false);
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get action type display name
  const getActionTypeName = (actionType: string) => {
    const actionTypes: Record<string, string> = {
      'report_submitted': 'Report Submitted',
      'report_fast_bonus': 'Fast Report Bonus',
      'task_completed_high': 'High Priority Task',
      'task_completed_medium': 'Medium Priority Task',
      'task_completed_low': 'Low Priority Task',
      'meeting_attended': 'Meeting Attended',
      'perfect_week': 'Perfect Week Bonus',
      'streak_milestone': 'Streak Milestone',
    };
    return actionTypes[actionType] || actionType;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-800 rounded"></div>
              <div className="h-64 bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <p className="text-red-400">Failed to load achievements data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Your Achievements</h1>
            <p className="text-gray-400 mt-1">Track your progress and earn rewards</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={claimEarnedBadges}
              disabled={claiming}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {claiming ? 'Claiming...' : '🏅 Claim Earned Badges'}
            </button>
            <Link
              href="/meeting-tracker/leaderboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View Leaderboard →
            </Link>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lifetime Level Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-200">Lifetime Level</h2>
              <span className="text-3xl">{stats.level_icon}</span>
            </div>

            <div>
              <div className="text-3xl font-bold text-blue-400">
                Level {stats.level}
              </div>
              <div className="text-xl text-gray-300 mt-1">
                {stats.level_name}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
                  style={{ width: `${lifetimeProgress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {stats.lifetime_xp.toLocaleString()} XP
                </span>
                {stats.xp_to_next_level > 0 ? (
                  <span className="text-gray-500">
                    {stats.xp_to_next_level.toLocaleString()} to Level {stats.level + 1}
                  </span>
                ) : (
                  <span className="text-yellow-400">Max Level!</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 text-sm text-gray-400">
              Lifetime levels are permanent and never reset
            </div>
          </div>

          {/* Annual Tier Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-200">
                Annual Performance {stats.current_year}
              </h2>
              <span className="text-3xl">{stats.tier_icon}</span>
            </div>

            <div>
              <div className="text-3xl font-bold text-amber-400">
                {stats.tier_name}
              </div>
              <div className="text-xl text-gray-300 mt-1">
                Tier
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full transition-all duration-500"
                  style={{ width: `${annualProgress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {stats.current_year_xp.toLocaleString()} XP
                </span>
                {stats.xp_to_next_tier > 0 ? (
                  <span className="text-gray-500">
                    {stats.xp_to_next_tier.toLocaleString()} to next tier
                  </span>
                ) : (
                  <span className="text-yellow-400">Max Tier!</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 text-sm text-gray-400">
              Annual tiers reset on January 1st
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Current Streak */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{stats.current_streak > 0 ? '🔥' : '❄️'}</span>
              <div>
                <div className="text-2xl font-bold text-gray-100">
                  {stats.current_streak}
                </div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-2xl font-bold text-gray-100">
                  {stats.longest_streak}
                </div>
                <div className="text-xs text-gray-400">Best Streak</div>
              </div>
            </div>
          </div>

          {/* Reports Submitted */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📝</span>
              <div>
                <div className="text-2xl font-bold text-gray-100">
                  {stats.reports_submitted}
                </div>
                <div className="text-xs text-gray-400">Reports</div>
              </div>
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <div className="text-2xl font-bold text-gray-100">
                  {stats.tasks_completed}
                </div>
                <div className="text-xs text-gray-400">Tasks</div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Rank */}
        {stats.current_rank > 0 && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">📊</span>
                <div>
                  <div className="text-sm text-gray-400">Company Rank</div>
                  <div className="text-3xl font-bold text-gray-100">
                    #{stats.current_rank}
                  </div>
                </div>
              </div>
              <Link
                href="/meeting-tracker/leaderboard"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Full Leaderboard →
              </Link>
            </div>
          </div>
        )}

        {/* Badges Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-6">Badges</h2>

          {badgesLoading ? (
            <div className="animate-pulse text-center py-8 text-gray-400">
              Loading badges...
            </div>
          ) : (
            <>
              {/* Earned Badges */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">
                  Earned ({badges.filter(b => b.earned).length}/{badges.length})
                </h3>
                {badges.filter(b => b.earned).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl mb-3 block">🏅</span>
                    <p>No badges earned yet. Keep completing tasks to unlock badges!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {badges.filter(b => b.earned).map((badge) => (
                      <BadgeCard key={badge.badge_id} badge={badge} />
                    ))}
                  </div>
                )}
              </div>

              {/* In Progress Badges */}
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-4">
                  In Progress
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.filter(b => !b.earned).map((badge) => (
                    <BadgeCard key={badge.badge_id} badge={badge} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Recent Activity</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl mb-3 block">🎯</span>
              <p>No activity yet. Start completing tasks to earn XP!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.transaction_id}
                  className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-900/30 text-green-400">
                      <span className="text-lg font-bold">+{transaction.points}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {getActionTypeName(transaction.action_type)}
                      </div>
                      {transaction.description && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Badge Card Component
function BadgeCard({ badge }: { badge: BadgeWithProgress }) {
  const rarityColors: Record<string, string> = {
    common: 'border-gray-500 bg-gray-500/10',
    rare: 'border-blue-500 bg-blue-500/10',
    epic: 'border-purple-500 bg-purple-500/10',
    legendary: 'border-yellow-500 bg-yellow-500/10'
  };

  const rarityTextColors: Record<string, string> = {
    common: 'text-gray-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-yellow-400'
  };

  return (
    <div className={`
      bg-gray-800 border-2 ${rarityColors[badge.rarity] || rarityColors.common} rounded-lg p-4
      ${badge.earned ? 'opacity-100' : 'opacity-60'}
      transition-all hover:scale-105 hover:shadow-lg
    `}>
      <div className="flex items-start gap-3">
        <span className="text-4xl flex-shrink-0">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-200 truncate">{badge.name}</h4>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{badge.description}</p>

          {badge.earned ? (
            <p className="text-xs text-green-400 mt-2 font-medium">
              ✓ Unlocked {badge.unlocked_at ? new Date(badge.unlocked_at).toLocaleDateString() : ''}
            </p>
          ) : (
            <>
              <div className="mt-3 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${badge.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{badge.progress_text}</p>
            </>
          )}

          <span className={`
            inline-block px-2 py-0.5 text-xs rounded-full mt-2
            ${rarityTextColors[badge.rarity] || rarityTextColors.common}
            bg-gray-900/50
          `}>
            {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <MeetingTrackerSidebar>
        <AchievementsContent />
      </MeetingTrackerSidebar>
    </ProtectedRoute>
  );
}
