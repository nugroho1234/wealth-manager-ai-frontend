'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface HierarchyNode {
  member_id: string;
  user_id: string;
  name: string;
  email: string;
  level: number;
  team_name: string | null;
  position_title: string | null;
  depth: number;
  manager_id: string | null;
}

interface GamificationStats {
  user_id: string;
  has_stats: boolean;
  lifetime_xp?: number;
  level?: number;
  level_name?: string;
  level_icon?: string;
  xp_to_next_level?: number;
  current_year_xp?: number;
  current_year?: number;
  annual_tier?: string;
  tier_name?: string;
  tier_icon?: string;
  xp_to_next_tier?: number;
  current_streak?: number;
  longest_streak?: number;
  reports_submitted?: number;
  tasks_completed?: number;
}

interface HierarchyByLevel {
  [key: number]: HierarchyNode[];
}

interface ManagerGroup {
  manager: HierarchyNode;
  directReports: HierarchyNode[];
}

type ViewMode = 'level' | 'manager';

function MyTeamContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('level');
  const [gamificationStats, setGamificationStats] = useState<Map<string, GamificationStats>>(new Map());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchHierarchyData();
  }, []);

  const fetchGamificationStats = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Fetch team gamification stats
      const response = await fetch(
        `${API_BASE_URL}/api/v1/gamification/team-stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.warn('Failed to fetch team gamification stats');
        return;
      }

      const data = await response.json();
      if (data.success && data.data.team_members) {
        const statsMap = new Map<string, GamificationStats>();
        data.data.team_members.forEach((member: GamificationStats) => {
          statsMap.set(member.user_id, member);
        });
        setGamificationStats(statsMap);
      }
    } catch (err) {
      console.error('Failed to fetch gamification stats:', err);
    }
  };

  const fetchHierarchyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        throw new Error('No authentication token found');
      }
      const { access_token: token } = JSON.parse(authTokens);

      // Fetch current user's hierarchy info first
      const meResponse = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!meResponse.ok) {
        throw new Error('Failed to fetch current user hierarchy info');
      }

      const meData = await meResponse.json();

      if (!meData.is_in_hierarchy) {
        setError('You are not part of any team hierarchy');
        setLoading(false);
        return;
      }

      setCurrentUserMemberId(meData.member_id);

      // Fetch hierarchy tree
      const treeResponse = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/tree`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!treeResponse.ok) {
        throw new Error('Failed to fetch hierarchy tree');
      }

      const treeData = await treeResponse.json();

      if (treeData.tree && treeData.tree.length > 0) {
        setHierarchyData(treeData.tree);
        // Fetch gamification stats for team members
        await fetchGamificationStats();
      } else {
        setError('No team hierarchy data available');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (userId: string) => {
    router.push(`/meeting-tracker/dashboard?view=${userId}`);
  };

  const organizeByLevel = (nodes: HierarchyNode[]): HierarchyByLevel => {
    const byLevel: HierarchyByLevel = {};
    nodes.forEach(node => {
      if (!byLevel[node.level]) {
        byLevel[node.level] = [];
      }
      byLevel[node.level].push(node);
    });
    return byLevel;
  };

  const getLevelLabel = (level: number): string => {
    const labels: { [key: number]: string } = {
      1: 'Level 1 - Top Leadership',
      2: 'Level 2 - Senior Management',
      3: 'Level 3 - Team Leads',
      4: 'Level 4 - Team Members'
    };
    return labels[level] || `Level ${level}`;
  };

  const organizeByManager = (nodes: HierarchyNode[]): ManagerGroup[] => {
    // Create a map of member_id to node for quick lookup
    const nodeMap = new Map<string, HierarchyNode>();
    nodes.forEach(node => nodeMap.set(node.member_id, node));

    // Group nodes by their manager_id
    const managerGroups = new Map<string, HierarchyNode[]>();

    nodes.forEach(node => {
      if (node.manager_id) {
        // This person has a manager, add them to that manager's group
        if (!managerGroups.has(node.manager_id)) {
          managerGroups.set(node.manager_id, []);
        }
        managerGroups.get(node.manager_id)!.push(node);
      }
    });

    // Convert map to array of ManagerGroups
    const groups: ManagerGroup[] = [];
    managerGroups.forEach((reports, managerId) => {
      const manager = nodeMap.get(managerId);
      if (manager) {
        groups.push({
          manager,
          directReports: reports
        });
      }
    });

    // Sort by manager level, then by name
    groups.sort((a, b) => {
      if (a.manager.level !== b.manager.level) {
        return a.manager.level - b.manager.level;
      }
      return a.manager.name.localeCompare(b.manager.name);
    });

    return groups;
  };

  const renderStatsModal = () => {
    if (!selectedMemberId) return null;

    const member = hierarchyData.find(node => node.user_id === selectedMemberId);
    const stats = gamificationStats.get(selectedMemberId);

    if (!member) return null;

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setSelectedMemberId(null)}
      >
        <div
          className="bg-gray-800 rounded-xl border-2 border-gray-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-br from-primary-600 to-primary-800 text-white px-6 py-4 rounded-t-xl border-b border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{member.name}</h2>
                <p className="text-sm text-primary-100 mt-1">
                  {member.position_title || 'Team Member'} {member.team_name && `• ${member.team_name}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberId(null)}
                className="text-white hover:text-gray-200 transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {!stats || !stats.has_stats ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-400">No gamification data available</p>
                <p className="text-sm text-gray-500 mt-2">This user hasn't earned any XP yet.</p>
              </div>
            ) : (
              <>
                {/* Lifetime Progress Section */}
                <div className="bg-gray-700/50 rounded-lg p-5 space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl">{stats.level_icon}</span>
                    Lifetime Progress
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Current Level</p>
                      <p className="text-2xl font-bold text-primary-400">
                        Level {stats.level}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">{stats.level_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total XP</p>
                      <p className="text-2xl font-bold text-white">{stats.lifetime_xp?.toLocaleString()}</p>
                      <p className="text-sm text-gray-400 mt-1">All-time experience</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress to Level {(stats.level || 0) + 1}</span>
                      <span className="text-primary-400 font-medium">{stats.xp_to_next_level?.toLocaleString()} XP needed</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((stats.lifetime_xp || 0) / ((stats.lifetime_xp || 0) + (stats.xp_to_next_level || 1))) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Annual Performance Section */}
                <div className="bg-gray-700/50 rounded-lg p-5 space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl">{stats.tier_icon}</span>
                    {stats.current_year || new Date().getFullYear()} Performance
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Annual Tier</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {stats.annual_tier}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">{stats.tier_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">This Year's XP</p>
                      <p className="text-2xl font-bold text-white">{stats.current_year_xp?.toLocaleString()}</p>
                      <p className="text-sm text-gray-400 mt-1">Annual progress</p>
                    </div>
                  </div>
                  {stats.xp_to_next_tier !== undefined && stats.xp_to_next_tier > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress to next tier</span>
                        <span className="text-orange-400 font-medium">{stats.xp_to_next_tier.toLocaleString()} XP needed</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((stats.current_year_xp || 0) / ((stats.current_year_xp || 0) + (stats.xp_to_next_tier || 1))) * 100))}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🔥</div>
                    <p className="text-2xl font-bold text-orange-400">{stats.current_streak || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Current Streak</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <p className="text-2xl font-bold text-yellow-400">{stats.longest_streak || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Longest Streak</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <p className="text-2xl font-bold text-blue-400">{stats.reports_submitted || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Reports</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-2xl font-bold text-green-400">{stats.tasks_completed || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Tasks</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 rounded-b-xl">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedMemberId(null);
                  handleCardClick(member.user_id);
                }}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                View Full Dashboard →
              </button>
              <button
                onClick={() => setSelectedMemberId(null)}
                className="px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGamificationBadge = (userId: string) => {
    const stats = gamificationStats.get(userId);

    if (!stats || !stats.has_stats) {
      return (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <span className="text-xs text-gray-500">No gamification data</span>
        </div>
      );
    }

    return (
      <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{stats.level_icon} Level {stats.level}</span>
          <span className="text-primary-400">{stats.tier_icon} {stats.tier_name}</span>
        </div>
        {stats.current_streak && stats.current_streak > 0 && (
          <div className="text-xs text-orange-400">
            🔥 {stats.current_streak} day streak
          </div>
        )}
        <div className="text-xs text-gray-500">
          {stats.reports_submitted || 0} reports • {stats.tasks_completed || 0} tasks
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-white mb-6">My Team</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-white mb-6">My Team</h1>
          <div className="flex items-center justify-center h-64 bg-red-900/20 rounded-lg">
            <div className="text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchHierarchyData}
                className="text-sm text-primary-400 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hierarchyByLevel = organizeByLevel(hierarchyData);
  const levels = Object.keys(hierarchyByLevel).map(Number).sort();
  const managerGroups = organizeByManager(hierarchyData);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Team</h1>
              <p className="mt-1 text-sm text-gray-400">
                Organizational hierarchy and team structure
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('level')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'level'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                By Level
              </button>
              <button
                onClick={() => setViewMode('manager')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'manager'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                By Manager
              </button>
            </div>
          </div>
        </div>

        {/* Org Chart */}
        <div className="p-6 bg-gray-900">
          {/* By Level View */}
          {viewMode === 'level' && (
            <div className="space-y-8">
              {levels.map((level) => (
                <div key={level} className="space-y-4">
                  {/* Level Header */}
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {level}
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      {getLevelLabel(level)}
                    </h2>
                    <span className="text-sm text-gray-400">
                      ({hierarchyByLevel[level].length} {hierarchyByLevel[level].length === 1 ? 'person' : 'people'})
                    </span>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {hierarchyByLevel[level].map((node) => {
                      const isCurrentUser = node.member_id === currentUserMemberId;

                      return (
                        <div
                          key={node.member_id}
                          onClick={() => setSelectedMemberId(node.user_id)}
                          className={`
                            relative text-left p-4 rounded-lg border-2 transition-all cursor-pointer
                            ${isCurrentUser
                              ? 'bg-primary-900/30 border-primary-500 shadow-md'
                              : 'bg-gray-700 border-gray-600 hover:border-primary-400 hover:shadow-md'
                            }
                          `}
                        >
                          {/* Current User Badge */}
                          {isCurrentUser && (
                            <div className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                              You
                            </div>
                          )}

                          {/* Name */}
                          <div className="font-semibold text-white mb-1">
                            {node.name}
                          </div>

                          {/* Position Title */}
                          {node.position_title && (
                            <div className="text-sm text-primary-400 font-medium mb-2">
                              {node.position_title}
                            </div>
                          )}

                          {/* Team Name */}
                          {node.team_name && (
                            <div className="text-xs text-gray-300 mb-2">
                              Team: {node.team_name}
                            </div>
                          )}

                          {/* Email */}
                          <div className="text-xs text-gray-400 truncate">
                            {node.email}
                          </div>

                          {/* Gamification Badge */}
                          {renderGamificationBadge(node.user_id)}

                          {/* Depth Indicator */}
                          {node.depth > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-600">
                              <span className="text-xs text-gray-400">
                                {node.depth === 1 ? 'Direct report' : `${node.depth} levels down`}
                              </span>
                            </div>
                          )}

                          {/* Click to view dashboard button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(node.user_id);
                            }}
                            className="mt-3 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                          >
                            Click to view dashboard →
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connection lines between levels */}
                  {level < Math.max(...levels) && (
                    <div className="flex justify-center">
                      <div className="w-px h-4 bg-gray-600"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* By Manager View */}
          {viewMode === 'manager' && (
            <div className="space-y-8">
              {managerGroups.map((group) => {
                const isCurrentUser = group.manager.member_id === currentUserMemberId;

                return (
                  <div key={group.manager.member_id} className="space-y-4">
                    {/* Manager Header */}
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                        {group.manager.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold text-white">
                            {group.manager.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {group.manager.position_title && (
                            <span className="text-primary-400">
                              {group.manager.position_title}
                            </span>
                          )}
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">
                            {group.directReports.length} direct {group.directReports.length === 1 ? 'report' : 'reports'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Reports Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-12">
                      {group.directReports.map((node) => {
                        const isReportCurrentUser = node.member_id === currentUserMemberId;

                        return (
                          <div
                            key={node.member_id}
                            onClick={() => setSelectedMemberId(node.user_id)}
                            className={`
                              relative text-left p-4 rounded-lg border-2 transition-all cursor-pointer
                              ${isReportCurrentUser
                                ? 'bg-primary-900/30 border-primary-500 shadow-md'
                                : 'bg-gray-700 border-gray-600 hover:border-primary-400 hover:shadow-md'
                              }
                            `}
                          >
                            {/* Current User Badge */}
                            {isReportCurrentUser && (
                              <div className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                You
                              </div>
                            )}

                            {/* Name */}
                            <div className="font-semibold text-white mb-1">
                              {node.name}
                            </div>

                            {/* Position Title */}
                            {node.position_title && (
                              <div className="text-sm text-primary-400 font-medium mb-2">
                                {node.position_title}
                              </div>
                            )}

                            {/* Team Name */}
                            {node.team_name && (
                              <div className="text-xs text-gray-300 mb-2">
                                Team: {node.team_name}
                              </div>
                            )}

                            {/* Email */}
                            <div className="text-xs text-gray-400 truncate">
                              {node.email}
                            </div>

                            {/* Gamification Badge */}
                            {renderGamificationBadge(node.user_id)}

                            {/* Level Badge */}
                            <div className="mt-2 pt-2 border-t border-gray-600">
                              <span className="text-xs text-gray-400">
                                Level {node.level}
                              </span>
                            </div>

                            {/* Click to view dashboard button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(node.user_id);
                              }}
                              className="mt-3 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            >
                              Click to view dashboard →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {hierarchyData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-400">No team members found</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="border-t border-gray-700 bg-gray-800 px-6 py-4">
          <p className="text-sm text-gray-300">
            <span className="font-medium">Tip:</span> Click on any team member card to view their gamification stats, or click "View dashboard" to see their full dashboard.
          </p>
        </div>
      </div>

      {/* Gamification Stats Modal */}
      {renderStatsModal()}
    </div>
  );
}

export default function MyTeamPage() {
  return (
    <ProtectedRoute>
      <MeetingTrackerSidebar>
        <MyTeamContent />
      </MeetingTrackerSidebar>
    </ProtectedRoute>
  );
}
