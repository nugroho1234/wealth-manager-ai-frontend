'use client';

import { useState } from 'react';

interface TaskFormProps {
  selectedUserId: string;
  onSubmit: (taskData: TaskFormData) => Promise<void>;
  onCancel: () => void;
}

export interface TaskFormData {
  task_description: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date: string; // YYYY-MM-DD format
  assigned_to: string;
}

/**
 * TaskForm Component
 *
 * Form for creating a new task manually.
 * Phase 4: Quick task creation with essential fields.
 */
export default function TaskForm({ selectedUserId, onSubmit, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    task_description: '',
    priority: 'Medium',
    due_date: '',
    assigned_to: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    if (!formData.task_description.trim()) {
      newErrors.task_description = 'Task description is required';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    // Validate due date is not in the past
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        newErrors.due_date = 'Due date cannot be in the past';
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
      {/* Task Description */}
      <div>
        <label htmlFor="task_description" className="block text-sm font-medium text-gray-300 mb-1">
          Task Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="task_description"
          value={formData.task_description}
          onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
          rows={3}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.task_description ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none`}
          placeholder="Enter task description or action item"
          disabled={loading}
        />
        {errors.task_description && <p className="mt-1 text-xs text-red-500">{errors.task_description}</p>}
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
          Priority <span className="text-red-500">*</span>
        </label>
        <select
          id="priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'High' | 'Medium' | 'Low' })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={loading}
        >
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-300 mb-1">
          Due Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="due_date"
          value={formData.due_date}
          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.due_date ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
          disabled={loading}
        />
        {errors.due_date && <p className="mt-1 text-xs text-red-500">{errors.due_date}</p>}
      </div>

      {/* Assigned To */}
      <div>
        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-300 mb-1">
          Assigned To (Optional)
        </label>
        <input
          type="text"
          id="assigned_to"
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter person's name"
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
            'Create Task'
          )}
        </button>
      </div>
    </form>
  );
}
