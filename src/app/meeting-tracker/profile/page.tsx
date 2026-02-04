'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { ApiError } from '@/types/auth';
import { formatErrorForDisplay } from '@/lib/utils';

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

// Validation schema
const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  phone: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Optional field
      // Basic phone validation - allows various formats
      return /^[\+]?[0-9\-\(\)\s]{10,20}$/.test(val);
    },
    {
      message: 'Please enter a valid phone number',
    }
  ),
  timezone: z.string().min(1, 'Timezone is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileContent() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTimezone, setCurrentTimezone] = useState<string>('UTC');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      timezone: 'UTC',
    },
  });

  // Fetch user settings to get timezone
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const authTokens = localStorage.getItem('auth_tokens');
        if (!authTokens) return;
        const { access_token: token } = JSON.parse(authTokens);

        const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const userTimezone = data.settings?.timezone || 'UTC';
          setCurrentTimezone(userTimezone);
          form.setValue('timezone', userTimezone);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    };

    fetchUserSettings();
  }, [form]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) throw new Error('Not authenticated');
      const { access_token: token } = JSON.parse(authTokens);

      // Update user profile
      await updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      });

      // Update timezone in meeting tracker settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: data.timezone }),
      });

      if (!settingsRes.ok) {
        throw new Error('Failed to update timezone');
      }

      await refreshUser();
      setCurrentTimezone(data.timezone);
      setSuccess('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.detail || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) return null;

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 text-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
            <p className="text-gray-400">Manage your personal information and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-6">Personal Information</h2>

                {error && (
                  <div className="mb-4 bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                    {formatErrorForDisplay(error)}
                  </div>
                )}

                {success && (
                  <div className="mb-4 bg-green-900 bg-opacity-20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
                        First Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...form.register('first_name')}
                        type="text"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your first name"
                      />
                      {form.formState.errors.first_name && (
                        <p className="mt-1 text-sm text-red-400">
                          {formatErrorForDisplay(form.formState.errors.first_name.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...form.register('last_name')}
                        type="text"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your last name"
                      />
                      {form.formState.errors.last_name && (
                        <p className="mt-1 text-sm text-red-400">
                          {formatErrorForDisplay(form.formState.errors.last_name.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      {...form.register('phone')}
                      type="tel"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your phone number (e.g., +1 555-123-4567)"
                    />
                    {form.formState.errors.phone && (
                      <p className="mt-1 text-sm text-red-400">
                        {formatErrorForDisplay(form.formState.errors.phone.message)}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Optional contact information for notifications.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone <span className="text-red-400">*</span>
                    </label>
                    <select
                      {...form.register('timezone')}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.timezone && (
                      <p className="mt-1 text-sm text-red-400">
                        {formatErrorForDisplay(form.formState.errors.timezone.message)}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Used for scheduling meetings and sending notifications at the correct time.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Account Information Sidebar */}
            <div>
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-6">Account Information</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Email Address</h3>
                    <p className="mt-1 text-sm text-white">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">Cannot be changed</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Phone Number</h3>
                    <p className="mt-1 text-sm text-white">
                      {user.phone || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Current Timezone</h3>
                    <p className="mt-1 text-sm text-white">
                      {COMMON_TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone}
                    </p>
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-sm font-medium text-gray-400">Member Since</h3>
                    <p className="mt-1 text-sm text-white">{formatDate(user.created_at)}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Last Updated</h3>
                    <p className="mt-1 text-sm text-white">
                      {user.updated_at ? formatDate(user.updated_at) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Completion Tip */}
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-xl p-4 mt-6">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">💡</span>
                  <div>
                    <h3 className="text-sm font-medium text-blue-400 mb-1">Sync Across Apps</h3>
                    <p className="text-xs text-gray-400">
                      Your profile is shared across all WealthTalk apps. When you upgrade to Oracle,
                      your information will already be there.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MeetingTrackerSidebar>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
