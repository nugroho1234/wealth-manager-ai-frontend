'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Subordinate {
  member_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  level: number;
  team_name?: string;
  position_title?: string;
  depth: number;
}

interface UserSelectorDropdownProps {
  value: string; // user_id of selected user
  onChange: (userId: string) => void;
  label?: string;
}

/**
 * UserSelectorDropdown Component
 *
 * Allows leaders to select who they're creating a meeting/task for.
 * Shows "For myself" option + list of all subordinates.
 */
export default function UserSelectorDropdown({ value, onChange, label = "For" }: UserSelectorDropdownProps) {
  const { user } = useAuth();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchSubordinates();
  }, []);

  const fetchSubordinates = async () => {
    setLoading(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/subordinates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubordinates(data.subordinates || []);
      }
    } catch (error) {
      console.error('Failed to fetch subordinates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter subordinates based on search query
  const filteredSubordinates = useMemo(() => {
    if (!searchQuery) return subordinates;

    const query = searchQuery.toLowerCase();
    return subordinates.filter(
      (sub) =>
        sub.user_name?.toLowerCase().includes(query) ||
        sub.user_email?.toLowerCase().includes(query) ||
        sub.position_title?.toLowerCase().includes(query) ||
        sub.team_name?.toLowerCase().includes(query)
    );
  }, [subordinates, searchQuery]);

  // Get selected user details
  const selectedUser = useMemo(() => {
    if (value === user?.id && user) {
      return {
        name: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.email?.split('@')[0] || 'You',
        isSelf: true,
      };
    }

    const subordinate = subordinates.find((sub) => sub.user_id === value);
    if (subordinate) {
      return {
        name: subordinate.user_name || 'Unknown User',
        position: subordinate.position_title,
        team: subordinate.team_name,
        isSelf: false,
      };
    }

    // Fallback when no match found
    return {
      name: user?.id === value && user ? (
        user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.email?.split('@')[0] || 'You'
      ) : 'Unknown User',
      isSelf: value === user?.id,
    };
  }, [value, user, subordinates]);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <div className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  // If no subordinates, just show current user (non-leader case)
  if (subordinates.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <div className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
          {user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.email.split('@')[0]} (You)
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      <div className="relative">
        {/* Selected Value Display / Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-left flex items-center justify-between hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {selectedUser.name}
              {selectedUser.isSelf && <span className="text-primary-400 ml-2">(You)</span>}
            </div>
            {!selectedUser.isSelf && (selectedUser.position || selectedUser.team) && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">
                {selectedUser.position}
                {selectedUser.position && selectedUser.team && ' • '}
                {selectedUser.team}
              </div>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <div className="absolute z-20 w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-600">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Options List */}
              <div className="overflow-y-auto max-h-60">
                {/* For Myself Option */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(user!.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors ${
                    value === user?.id ? 'bg-primary-900/30 border-l-4 border-primary-500' : ''
                  }`}
                >
                  <div className="font-medium text-white">
                    {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user?.email.split('@')[0]}
                    <span className="text-primary-400 ml-2">(You)</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Create for myself
                  </div>
                </button>

                {/* Divider */}
                {filteredSubordinates.length > 0 && (
                  <div className="border-t border-gray-600 my-1"></div>
                )}

                {/* Subordinates List */}
                {filteredSubordinates.length > 0 ? (
                  filteredSubordinates.map((subordinate) => (
                    <button
                      key={subordinate.user_id}
                      type="button"
                      onClick={() => {
                        onChange(subordinate.user_id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors ${
                        value === subordinate.user_id ? 'bg-primary-900/30 border-l-4 border-primary-500' : ''
                      }`}
                    >
                      <div className="font-medium text-white truncate">
                        {subordinate.user_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {subordinate.position_title && (
                          <span>{subordinate.position_title}</span>
                        )}
                        {subordinate.position_title && subordinate.team_name && ' • '}
                        {subordinate.team_name && (
                          <span>{subordinate.team_name}</span>
                        )}
                        {!subordinate.position_title && !subordinate.team_name && (
                          <span>{subordinate.user_email}</span>
                        )}
                      </div>
                      {subordinate.depth > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {subordinate.depth === 1 ? 'Direct report' : `${subordinate.depth} levels down`}
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    No team members found
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-750 border-t border-gray-600 text-xs text-gray-400">
                {subordinates.length} team member{subordinates.length !== 1 ? 's' : ''}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
