'use client';

export interface TaskFormFieldsData {
  task_description: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date: string;
  assigned_to: string;
}

interface TaskFormFieldsProps {
  formData: TaskFormFieldsData;
  onChange: (data: TaskFormFieldsData) => void;
  errors?: Partial<Record<keyof TaskFormFieldsData, string>>;
  disabled?: boolean;
  showLabels?: boolean;
}

/**
 * TaskFormFields Component
 *
 * Reusable form fields for task creation.
 * Phase 3: Extracted from TaskForm for multi-task creation support.
 *
 * Features:
 * - Four essential fields: description, priority, due date, assigned to
 * - Controlled component pattern
 * - Validation error display
 * - Disabled state support
 * - Optional labels (for cleaner multi-task UI)
 */
export default function TaskFormFields({
  formData,
  onChange,
  errors = {},
  disabled = false,
  showLabels = true,
}: TaskFormFieldsProps) {
  const handleFieldChange = (field: keyof TaskFormFieldsData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Task Description */}
      <div>
        {showLabels && (
          <label htmlFor="task_description" className="block text-sm font-medium text-gray-300 mb-1">
            Task Description <span className="text-red-500">*</span>
          </label>
        )}
        <textarea
          id="task_description"
          value={formData.task_description}
          onChange={(e) => handleFieldChange('task_description', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.task_description ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none`}
          placeholder="Enter task description or action item"
          disabled={disabled}
        />
        {errors.task_description && (
          <p className="mt-1 text-xs text-red-500">{errors.task_description}</p>
        )}
      </div>

      {/* Priority */}
      <div>
        {showLabels && (
          <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
            Priority <span className="text-red-500">*</span>
          </label>
        )}
        <select
          id="priority"
          value={formData.priority}
          onChange={(e) => handleFieldChange('priority', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={disabled}
        >
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>
      </div>

      {/* Due Date */}
      <div>
        {showLabels && (
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-300 mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
        )}
        <input
          type="date"
          id="due_date"
          value={formData.due_date}
          onChange={(e) => handleFieldChange('due_date', e.target.value)}
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errors.due_date ? 'border-red-500' : 'border-gray-600'
          } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
          disabled={disabled}
        />
        {errors.due_date && <p className="mt-1 text-xs text-red-500">{errors.due_date}</p>}
      </div>

      {/* Assigned To */}
      <div>
        {showLabels && (
          <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-300 mb-1">
            Assigned To (Optional)
          </label>
        )}
        <input
          type="text"
          id="assigned_to"
          value={formData.assigned_to}
          onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter person's name"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
