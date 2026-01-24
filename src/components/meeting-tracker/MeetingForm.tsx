'use client';

import { useState } from 'react';

interface MeetingFormProps {
  selectedUserId: string;
  onSubmit: (meetingData: MeetingFormData) => Promise<void>;
  onCancel: () => void;
}

export interface MeetingFormData {
  title: string;
  category: 'R' | 'N' | 'S';
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  description: string;
}

/**
 * MeetingForm Component
 *
 * Form for creating a new meeting manually.
 * Phase 3: Quick meeting creation with essential fields.
 */
export default function MeetingForm({ selectedUserId, onSubmit, onCancel }: MeetingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    category: 'N',
    date: '',
    start_time: '',
    end_time: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MeetingFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MeetingFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }

    if (formData.date && formData.start_time && formData.end_time) {
      // Combine date + time to compare
      const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}`);

      if (endDateTime <= startDateTime) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (loading) return; // Prevent double submission

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
          Meeting Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.title ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500`}
          placeholder="Enter meeting title"
          disabled={loading}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as 'R' | 'N' | 'S' })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={loading}
        >
          <option value="N">New Business (N)</option>
          <option value="R">Recruitment (R)</option>
          <option value="S">Sales (S)</option>
        </select>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.date ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
          disabled={loading}
        />
        {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
      </div>

      {/* Start Time */}
      <div>
        <label htmlFor="start_time" className="block text-sm font-medium text-gray-300 mb-1">
          Start Time <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          id="start_time"
          value={formData.start_time}
          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.start_time ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
          disabled={loading}
        />
        {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
      </div>

      {/* End Time */}
      <div>
        <label htmlFor="end_time" className="block text-sm font-medium text-gray-300 mb-1">
          End Time <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          id="end_time"
          value={formData.end_time}
          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.end_time ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
          disabled={loading}
        />
        {errors.end_time && <p className="mt-1 text-xs text-red-500">{errors.end_time}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Add meeting description or notes"
          disabled={loading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Meeting'
          )}
        </button>
      </div>
    </form>
  );
}
