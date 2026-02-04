'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Subordinate {
  member_id: string;
  user_id: string;
  manager_id?: string;
  level: number;
  team_name?: string;
  position_title?: string;
  user_name?: string;
  user_email: string;
  depth: number;
}

interface TeamFilterProps {
  value: string; // 'me', 'team', or specific user_id
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Team Filter Component
 *
 * Allows leaders to filter data by:
 * - "My Data" - Only the current user's data
 * - "My Team (All)" - All subordinates' data combined
 * - Individual subordinates - Specific subordinate's data
 *
 * Only shows if the user is a leader (has subordinates)
 */
export default function TeamFilter({ value, onChange, className = '' }: TeamFilterProps) {
  const [isLeader, setIsLeader] = useState(false);
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLeaderStatus();
  }, []);

  const checkLeaderStatus = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        // console.log('[TeamFilter] No auth tokens found');
        setLoading(false);
        return;
      }

      const { access_token: token } = JSON.parse(authTokens);

      // Check if user is a leader by getting their hierarchy info
      const hierarchyRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log('[TeamFilter] Hierarchy check response status:', hierarchyRes.status);

      if (!hierarchyRes.ok) {
        const errorText = await hierarchyRes.text();
        // console.log('[TeamFilter] Hierarchy check failed:', errorText);
        setLoading(false);
        return;
      }

      const hierarchyData = await hierarchyRes.json();
      // console.log('[TeamFilter] Hierarchy data:', hierarchyData);

      // Check if user is in hierarchy and is a leader
      const isInHierarchy = hierarchyData.is_in_hierarchy || false;
      const isUserLeader = hierarchyData.is_leader || false;

      // console.log('[TeamFilter] Is in hierarchy?', isInHierarchy, 'Is leader?', isUserLeader);
      setIsLeader(isUserLeader);

      // If user is a leader, fetch subordinates
      if (isUserLeader) {
        const subRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/subordinates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // console.log('[TeamFilter] Subordinates response status:', subRes.status);

        if (subRes.ok) {
          const subData = await subRes.json();
          // console.log('[TeamFilter] Subordinates data:', subData);
          // The response structure is { subordinates: [...], total_count: N }
          setSubordinates(subData.subordinates || []);
        }
      }
    } catch (error) {
      console.error('[TeamFilter] Error checking leader status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not a leader or still loading
  if (loading || !isLeader || subordinates.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="team-filter" className="text-sm font-medium text-gray-300">
        View:
      </label>
      <select
        id="team-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="me">My Data</option>
        <option value="team">My Team (All {subordinates.length})</option>
        <optgroup label="Individual Team Members">
          {subordinates
            .sort((a, b) => {
              // Sort by depth (direct reports first), then by name
              if (a.depth !== b.depth) return a.depth - b.depth;
              const aName = a.user_name || a.user_email || 'Unknown';
              const bName = b.user_name || b.user_email || 'Unknown';
              return aName.localeCompare(bName);
            })
            .map((sub) => {
              const name = sub.user_name || (sub.user_email ? sub.user_email.split('@')[0] : 'Unknown');
              const indent = '  '.repeat(sub.depth); // Visual indent for hierarchy
              const title = sub.position_title ? ` (${sub.position_title})` : '';

              return (
                <option key={sub.user_id} value={sub.user_id}>
                  {indent}{name}{title}
                </option>
              );
            })}
        </optgroup>
      </select>
    </div>
  );
}
