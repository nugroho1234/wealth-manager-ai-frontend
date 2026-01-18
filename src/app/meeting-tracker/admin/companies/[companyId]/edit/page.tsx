'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  plan_type: 'meeting_tracker' | 'oracle';
  website: string;
  meeting_prefix: string;
  vision: string;
  mission: string;
  summary: string;
  tagline: string;
  address: string;
  logo_url?: string;
}

const TIMEZONES_BY_COUNTRY: Record<string, string[]> = {
  'Indonesia': ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
  'Singapore': ['Asia/Singapore'],
  'Malaysia': ['Asia/Kuala_Lumpur'],
  'Philippines': ['Asia/Manila'],
  'Thailand': ['Asia/Bangkok'],
  'Vietnam': ['Asia/Ho_Chi_Minh'],
  'United States': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  'United Kingdom': ['Europe/London'],
  'Australia': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
};

const COUNTRIES = Object.keys(TIMEZONES_BY_COUNTRY).sort();

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.companyId as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    timezone: '',
    plan_type: 'meeting_tracker',
    website: '',
    meeting_prefix: '',
    vision: '',
    mission: '',
    summary: '',
    tagline: '',
    address: '',
    logo_url: '',
  });

  // Check admin access
  const isAdmin = user?.role_id === 1 || user?.role_id === 2;

  useEffect(() => {
    if (isAdmin && user && companyId) {
      fetchCompany();
    }
  }, [isAdmin, user, companyId]);

  const fetchCompany = async () => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch company details');
      const company = await response.json();

      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        country: company.country || '',
        city: company.city || '',
        timezone: company.timezone || '',
        plan_type: company.plan_type || 'meeting_tracker',
        website: company.website || '',
        meeting_prefix: company.meeting_prefix || '',
        vision: company.vision || '',
        mission: company.mission || '',
        summary: company.summary || '',
        tagline: company.tagline || '',
        address: company.address || '',
        logo_url: company.logo_url || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset timezone when country changes
      if (name === 'country') {
        updated.timezone = '';
      }

      return updated;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/logo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataUpload,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload logo');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, logo_url: data.logo_url }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            country: formData.country,
            city: formData.city,
            timezone: formData.timezone,
            plan_type: formData.plan_type,
            website: formData.website || null,
            meeting_prefix: formData.meeting_prefix || null,
            vision: formData.vision || null,
            mission: formData.mission || null,
            summary: formData.summary || null,
            tagline: formData.tagline || null,
            address: formData.address || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update company');
      }

      // Redirect back to companies list
      router.push('/meeting-tracker/admin/companies');
    } catch (err: any) {
      setError(err.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You need admin privileges to access this page.</p>
          </div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  const availableTimezones = formData.country ? TIMEZONES_BY_COUNTRY[formData.country] || [] : [];

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Edit Company</h1>
            <p className="text-gray-400">
              Update company information, branding, and settings
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-400 text-xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Company Logo</h2>
              <div className="flex items-center space-x-6">
                {formData.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={formData.logo_url}
                      alt="Company logo"
                      className="w-24 h-24 object-contain bg-white rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label className="block">
                    <span className="sr-only">Choose logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-600 file:text-white
                        hover:file:bg-purple-700
                        file:cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                  <p className="text-gray-500 text-xs mt-2">
                    Recommended: Square image, max 5MB, PNG or JPG
                  </p>
                  {uploadingLogo && (
                    <p className="text-purple-400 text-sm mt-2">Uploading logo...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="ABC Financial Group"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="admin@abcfinancial.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+6281234567890"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="abcfinancial.com"
                />
              </div>

              {/* Country and City - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Jakarta"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timezone <span className="text-red-400">*</span>
                </label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.country}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.country ? 'Select timezone' : 'Select country first'}
                  </option>
                  {availableTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Full company address"
                />
              </div>

              {/* Meeting Prefix and Plan Type - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Meeting Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meeting Prefix <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="meeting_prefix"
                    value={formData.meeting_prefix}
                    onChange={handleInputChange}
                    maxLength={10}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="ABC-"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Meeting IDs will be prefixed with this value
                  </p>
                </div>

                {/* Plan Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plan Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="plan_type"
                    value={formData.plan_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="meeting_tracker">Meeting Tracker</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Profile */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Company Profile</h2>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tagline <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your Trusted Financial Partner"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Summary <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief overview of your company"
                />
              </div>

              {/* Vision */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vision <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  name="vision"
                  value={formData.vision}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Company vision statement"
                />
              </div>

              {/* Mission */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mission <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  name="mission"
                  value={formData.mission}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Company mission statement"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 bg-gray-800 rounded-lg p-6">
              <button
                type="button"
                onClick={() => router.push('/meeting-tracker/admin/companies')}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={saving || uploadingLogo}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MeetingTrackerSidebar>
  );
}
