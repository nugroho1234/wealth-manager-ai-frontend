'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  subscribed_plans: string[];
  website: string;
  meeting_prefix: string;
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

export default function NewCompanyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    timezone: '',
    subscribed_plans: ['oracle', 'meeting_tracker'], // Pre-checked both
    website: '',
    meeting_prefix: '',
  });

  // MASTER-only access
  const isMaster = user?.role_id === 7;

  if (!isMaster) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Only MASTER users can create new companies.</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

      const response = await fetch('http://localhost:8000/api/v1/admin/meeting-tracker/companies', {
        method: 'POST',
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
          subscribed_plans: formData.subscribed_plans,
          website: formData.website || null,
          meeting_prefix: formData.meeting_prefix || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create company');
      }

      const company = await response.json();

      // Redirect to CSV upload page
      router.push(`/oracle/master/companies/${company.company_id}/import`);
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const availableTimezones = formData.country ? TIMEZONES_BY_COUNTRY[formData.country] || [] : [];

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Company</h1>
            <p className="text-gray-600">
              Set up a new company profile. After creating the company, you'll be able to upload the team hierarchy CSV.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-700 font-semibold mb-1">Error</h3>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 space-y-6 border border-gray-200">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC Financial Group"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@abcfinancial.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+6281234567890"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jakarta"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone <span className="text-red-500">*</span>
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                required
                disabled={!formData.country}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Subscribed Plans */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscribed Plans <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {['oracle', 'meeting_tracker'].map((plan) => (
                  <label key={plan} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subscribed_plans.includes(plan)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            subscribed_plans: [...prev.subscribed_plans, plan]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            subscribed_plans: prev.subscribed_plans.filter(p => p !== plan)
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-900 capitalize">{plan.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {formData.subscribed_plans.length === 0 && (
                <p className="text-red-600 text-sm mt-1">Please select at least one plan</p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Note: Wealthlens and Digivault are not yet available
              </p>
            </div>

            {/* Website (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="abcfinancial.com"
              />
            </div>

            {/* Meeting Prefix (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Prefix <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                name="meeting_prefix"
                value={formData.meeting_prefix}
                onChange={handleInputChange}
                maxLength={10}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC-"
              />
              <p className="text-gray-500 text-xs mt-1">
                Meeting IDs will be prefixed with this value (e.g., ABC-001, ABC-002)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Company & Continue'}
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-500 text-xl mr-3">ℹ️</span>
              <div>
                <h3 className="text-blue-700 font-semibold mb-2">What's Next?</h3>
                <ul className="text-blue-600 text-sm space-y-1">
                  <li>1. Company will be created in "draft" status</li>
                  <li>2. You'll download a CSV template with examples</li>
                  <li>3. Send the template to the company to fill in their team data</li>
                  <li>4. Upload the completed CSV to activate the company</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
