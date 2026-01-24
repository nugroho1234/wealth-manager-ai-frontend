'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ViewContextBannerProps {
  userId: string | null;
}

interface UserInfo {
  email: string;
  first_name: string;
  last_name: string;
}

export default function ViewContextBanner({ userId }: ViewContextBannerProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && userId !== 'me') {
      fetchUserInfo(userId);
    } else {
      setUserInfo(null);
    }
  }, [userId]);

  const fetchUserInfo = async (id: string) => {
    setLoading(true);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Fetch user info from subordinates endpoint
      const response = await fetch(
        `${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/subordinates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();

      // Find the user in subordinates list
      const subordinate = data.subordinates.find((sub: any) => sub.user_id === id);

      if (subordinate) {
        setUserInfo({
          email: subordinate.user_email,
          first_name: subordinate.user_name.split(' ')[0] || '',
          last_name: subordinate.user_name.split(' ').slice(1).join(' ') || '',
        });
      }

    } catch (err) {
      console.error('Error fetching user info:', err);
    } finally {
      setLoading(false);
    }
  };

  // Don't show banner if viewing own data
  if (!userId || userId === 'me' || !userInfo) {
    return null;
  }

  const fullName = `${userInfo.first_name} ${userInfo.last_name}`.trim();

  return (
    <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-200">
              Viewing data for:
            </p>
            <p className="text-base font-semibold text-white">
              {fullName}
              <span className="text-sm text-blue-300 ml-2">({userInfo.email})</span>
            </p>
          </div>
        </div>
        <Link
          href="?view=me"
          className="text-sm font-medium text-blue-300 hover:text-blue-200 underline transition-colors"
        >
          Return to My View
        </Link>
      </div>
    </div>
  );
}
