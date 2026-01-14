'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ApiError } from '@/types/auth';
import { formatErrorForDisplay } from '@/lib/utils';

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
  company_id: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileContent() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      company_id: user?.company_id || undefined,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(data);
      await refreshUser();
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ADVISOR':
        return 'bg-blue-100 text-blue-800';
      case 'LEADER_1':
      case 'LEADER_2':
        return 'bg-green-100 text-green-800';
      case 'SENIOR_PARTNER':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
              <div className="flex items-center">
                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
                    {user.last_name && user.last_name[0].toUpperCase()}
                  </span>
                </div>
                <div className="ml-6">
                  <h1 className="text-3xl font-bold text-white">
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : 'Complete Your Profile'}
                  </h1>
                  <p className="text-primary-100">{user.email}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                      {formatRoleName(user.role)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Form */}
                <div className="lg:col-span-2">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h2>
                  
                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      {formatErrorForDisplay(error)}
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                      {success}
                    </div>
                  )}

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <div className="mt-1">
                          <input
                            {...form.register('first_name')}
                            type="text"
                            className="input-field"
                            placeholder="Enter your first name"
                          />
                          {form.formState.errors.first_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {formatErrorForDisplay(form.formState.errors.first_name.message)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <div className="mt-1">
                          <input
                            {...form.register('last_name')}
                            type="text"
                            className="input-field"
                            placeholder="Enter your last name"
                          />
                          {form.formState.errors.last_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {formatErrorForDisplay(form.formState.errors.last_name.message)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <input
                          {...form.register('phone')}
                          type="tel"
                          className="input-field"
                          placeholder="Enter your phone number (e.g., +1 555-123-4567)"
                        />
                        {form.formState.errors.phone && (
                          <p className="mt-1 text-sm text-red-600">
                            {formatErrorForDisplay(form.formState.errors.phone.message)}
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        This will be used as contact information in generated proposals.
                      </p>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Update Profile'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Account Information */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Account Information</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                      <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {user.phone || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Role</h3>
                      <p className="mt-1 text-sm text-gray-900">{formatRoleName(user.role)}</p>
                    </div>


                    {user.company && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Company</h3>
                        <p className="mt-1 text-sm text-gray-900">{user.company.name}</p>
                        {user.company.website && (
                          <a
                            href={user.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-xs text-primary-600 hover:text-primary-500"
                          >
                            Visit Website
                          </a>
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Profile Status</h3>
                      <div className="mt-1 flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${user.is_profile_complete ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        <span className="text-sm text-gray-900">
                          {user.is_profile_complete ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                    </div>


                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                      <p className="mt-1 text-sm text-gray-900">{user.updated_at ? formatDate(user.updated_at) : 'Never'}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}