'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Common timezones for dropdown
const COMMON_TIMEZONES = [
  { value: 'UTC', label: '(UTC+00:00) Coordinated Universal Time' },
  { value: 'America/New_York', label: '(UTC-05:00) Eastern Time - New York' },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time - Chicago' },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time - Denver' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Pacific Time - Los Angeles' },
  { value: 'Europe/London', label: '(UTC+00:00) London' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris, Berlin, Rome' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Athens, Istanbul' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) India - Mumbai, Delhi' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore, Kuala Lumpur' },
  { value: 'Asia/Jakarta', label: '(UTC+07:00) Jakarta' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo, Seoul' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland' },
];

interface GoogleCalendarStatus {
  is_connected: boolean;
  email?: string;
  last_sync?: string;
}

interface TelegramStatus {
  connected: boolean;
  chat_id?: string;
}

interface UserSettings {
  timezone: string;
  meeting_prefix: string;
}

function SettingsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google Calendar state
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ is_connected: false });
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false });
  const [generatingLink, setGeneratingLink] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // User preferences state
  const [settings, setSettings] = useState<UserSettings>({
    timezone: 'UTC',
    meeting_prefix: 'Meeting',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchAllSettings();

    // Check for OAuth callback success/error in URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      setSuccess('Google Calendar connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', '/meeting-tracker/settings');
      setTimeout(() => setSuccess(null), 5000);
    } else if (params.get('google_error') === 'true') {
      setError('Failed to connect Google Calendar. Please try again.');
      window.history.replaceState({}, '', '/meeting-tracker/settings');
      setTimeout(() => setError(null), 5000);
    }

    // Cleanup: Stop polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);


  const fetchAllSettings = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Fetch Google Calendar status
      const googleRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/google/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (googleRes.ok) {
        const data = await googleRes.json();
        setGoogleStatus({
          is_connected: data.connected,
          last_sync: data.last_sync_at,
          email: data.email,
        });
      }

      // Fetch Telegram status
      const telegramRes = await fetch(`${API_BASE_URL}/api/v1/telegram/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (telegramRes.ok) {
        const data = await telegramRes.json();
        if (data.success && data.data) {
          setTelegramStatus({
            connected: data.data.connected,
            chat_id: data.data.chat_id
          });
        }
      }

      // Fetch user settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          timezone: data.settings?.timezone || 'UTC',
          meeting_prefix: data.settings?.meeting_prefix || 'Meeting',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        console.error('No access token found');
        setError('Not authenticated. Please log in again.');
        return;
      }
      const { access_token: token } = JSON.parse(authTokens);

      // console.log('Connecting to Google Calendar...');
      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/google/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log('Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.detail || 'Failed to initiate Google OAuth');
      }

      const data = await res.json();
      // console.log('Auth URL received:', data);
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Your meetings will no longer sync.')) {
      return;
    }

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/google/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to disconnect');

      setGoogleStatus({ is_connected: false });
      setSuccess('Google Calendar disconnected successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to disconnect Google Calendar');
    }
  };

  const handleSyncNow = async () => {
    setSyncingCalendar(true);
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/google/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Sync failed');

      const data = await res.json();
      const created = data.stats?.meetings_created || 0;
      const updated = data.stats?.meetings_updated || 0;
      const total = created + updated;

      if (total === 0) {
        setSuccess('Calendar synced! No new meetings found.');
      } else if (total === 1) {
        setSuccess(`Calendar synced! 1 meeting ${created > 0 ? 'added' : 'updated'}.`);
      } else {
        const parts = [];
        if (created > 0) parts.push(`${created} added`);
        if (updated > 0) parts.push(`${updated} updated`);
        setSuccess(`Calendar synced! ${total} meetings (${parts.join(', ')}).`);
      }
      setTimeout(() => setSuccess(null), 5000);

      // Refresh status to get updated last_sync time
      await fetchAllSettings();
    } catch (error) {
      setError('Failed to sync calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const checkTelegramStatus = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const telegramRes = await fetch(`${API_BASE_URL}/api/v1/telegram/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (telegramRes.ok) {
        const data = await telegramRes.json();
        if (data.success && data.data) {
          setTelegramStatus({
            connected: data.data.connected,
            chat_id: data.data.chat_id
          });

          // If connected, stop polling and show success
          if (data.data.connected && pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
            setTelegramLink(null);
            setTelegramToken(null);
            setSuccess('Telegram connected successfully!');
            setTimeout(() => setSuccess(null), 5000);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Telegram status:', error);
    }
  };

  const handleGenerateTelegramLink = async () => {
    setGeneratingLink(true);
    setError(null);
    setSuccess(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/telegram/generate-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to generate Telegram link');
      }

      if (data.success && data.data.token) {
        setTelegramToken(data.data.token);
        setTelegramLink(data.data.deep_link);
        setSuccess('Follow the instructions below to connect your Telegram account!');
        setTimeout(() => setSuccess(null), 10000);

        // Start polling for connection status every 3 seconds
        const interval = setInterval(checkTelegramStatus, 3000);
        setPollingInterval(interval);

        // Stop polling after 15 minutes (token expiration)
        setTimeout(() => {
          if (interval) {
            clearInterval(interval);
            setPollingInterval(null);
          }
        }, 15 * 60 * 1000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate link');
      setTimeout(() => setError(null), 5000);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleTestNotification = async () => {
    setTestingTelegram(true);
    setError(null);
    setSuccess(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/telegram/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send test notification');
      }

      setSuccess('Test notification sent! Check your Telegram.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send test notification');
      setTimeout(() => setError(null), 5000);
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Are you sure you want to unlink Telegram? You will no longer receive notifications.')) {
      return;
    }

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/telegram/unlink`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to unlink');

      setTelegramStatus({ connected: false });
      setSuccess('Telegram unlinked successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to unlink Telegram');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading settings...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 text-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400">Manage your integrations and preferences</p>
          </div>

          {/* Global Success/Error Messages */}
          {error && (
            <div className="mb-6 bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900 bg-opacity-20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* Google Calendar Section */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Google Calendar</h2>
                  <p className="text-sm text-gray-400">
                    Connect your Google Calendar to automatically sync meetings
                  </p>
                </div>
                <span className="text-4xl">📅</span>
              </div>

              {googleStatus.is_connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs text-gray-400">{googleStatus.email}</p>
                    </div>
                  </div>

                  {googleStatus.last_sync && (
                    <div className="text-sm text-gray-400">
                      Last synced: {new Date(googleStatus.last_sync).toLocaleString()}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSyncNow}
                      disabled={syncingCalendar}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {syncingCalendar ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={handleDisconnectGoogle}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <p className="text-sm font-medium">Not Connected</p>
                  </div>

                  <button
                    onClick={handleConnectGoogle}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Connect Google Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Telegram Section */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Telegram Notifications</h2>
                  <p className="text-sm text-gray-400">
                    Link your Telegram account to receive meeting notifications
                  </p>
                </div>
                <span className="text-4xl">✈️</span>
              </div>

              {telegramStatus.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs text-gray-400 font-mono">
                        Chat ID: {telegramStatus.chat_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleTestNotification}
                      disabled={testingTelegram}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testingTelegram ? 'Sending...' : 'Send Test Notification'}
                    </button>
                    <button
                      onClick={handleUnlinkTelegram}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <p className="text-sm font-medium">Not Connected</p>
                  </div>

                  {!telegramLink ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        Connect your Telegram account to receive instant notifications for:
                      </p>
                      <ul className="text-sm text-gray-400 list-disc list-inside space-y-1 ml-2">
                        <li>Meeting report submissions</li>
                        <li>Follow-up meeting creation</li>
                        <li>Meeting reminders</li>
                      </ul>
                      <button
                        onClick={handleGenerateTelegramLink}
                        disabled={generatingLink}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {generatingLink ? 'Generating...' : 'Connect Telegram'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-300">
                          Follow these steps to connect:
                        </p>
                        <ol className="text-sm text-gray-300 space-y-3 list-decimal list-inside">
                          <li>
                            Open Telegram and search for your bot
                            {telegramLink && (
                              <a
                                href={telegramLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-blue-400 hover:text-blue-300 underline"
                              >
                                (or click here)
                              </a>
                            )}
                          </li>
                          <li>Click "Start" to begin conversation with the bot</li>
                          <li>
                            Send this message to the bot:
                            <div className="mt-2 bg-gray-800 rounded p-3 font-mono text-xs break-all relative group">
                              <code>connect {telegramToken}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`connect ${telegramToken}`);
                                  setSuccess('Copied to clipboard!');
                                  setTimeout(() => setSuccess(null), 2000);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs"
                              >
                                Copy
                              </button>
                            </div>
                          </li>
                          <li>Return here to see your connected status</li>
                        </ol>
                        <p className="text-xs text-gray-400 text-center mt-3">
                          This token expires in 15 minutes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Preferences Section */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Preferences</h2>
                  <p className="text-sm text-gray-400">
                    Customize your meeting tracking experience
                  </p>
                </div>
                <span className="text-4xl">⚙️</span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timezone <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Used for scheduling meetings and sending notifications at the correct time
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meeting Prefix <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.meeting_prefix}
                    onChange={(e) => setSettings({ ...settings, meeting_prefix: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Meeting"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Calendar events starting with this prefix will be tracked (e.g., "Meeting [R] - Interview")
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MeetingTrackerSidebar>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
