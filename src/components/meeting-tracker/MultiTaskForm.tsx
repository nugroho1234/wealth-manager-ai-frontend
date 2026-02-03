'use client';

import { useState } from 'react';
import TaskFormFields, { TaskFormFieldsData } from './TaskFormFields';

interface MultiTaskFormProps {
  selectedUserId: string;
  onSubmit: (tasks: TaskFormFieldsData[]) => Promise<void>;
  onCancel: () => void;
}

interface TaskWithId extends TaskFormFieldsData {
  id: string;
}

/**
 * MultiTaskForm Component
 *
 * Form for creating multiple tasks at once (up to 10).
 * Phase 4: Dynamic multi-task creation with add/remove functionality.
 *
 * Features:
 * - Start with one task form
 * - "Add Another Task" button (up to 10 tasks)
 * - Remove individual tasks
 * - Validate all tasks before submission
 * - Bulk submission preparation
 */
export default function MultiTaskForm({ selectedUserId, onSubmit, onCancel }: MultiTaskFormProps) {
  const [loading, setLoading] = useState(false);

  // Generate unique ID for each task
  const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize with one empty task
  const [tasks, setTasks] = useState<TaskWithId[]>([
    {
      id: generateTaskId(),
      task_description: '',
      priority: 'Medium',
      due_date: '',
      assigned_to: '',
    },
  ]);

  const [errors, setErrors] = useState<Record<string, Partial<Record<keyof TaskFormFieldsData, string>>>>({});

  const MAX_TASKS = 10;

  // Validate a single task
  const validateTask = (task: TaskFormFieldsData): Partial<Record<keyof TaskFormFieldsData, string>> => {
    const taskErrors: Partial<Record<keyof TaskFormFieldsData, string>> = {};

    if (!task.task_description.trim()) {
      taskErrors.task_description = 'Task description is required';
    }

    if (!task.due_date) {
      taskErrors.due_date = 'Due date is required';
    }

    // Validate due date is not in the past
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        taskErrors.due_date = 'Due date cannot be in the past';
      }
    }

    return taskErrors;
  };

  // Validate all tasks
  const validateAllTasks = (): boolean => {
    const newErrors: Record<string, Partial<Record<keyof TaskFormFieldsData, string>>> = {};
    let hasErrors = false;

    tasks.forEach((task) => {
      const taskErrors = validateTask(task);
      if (Object.keys(taskErrors).length > 0) {
        newErrors[task.id] = taskErrors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  // Add a new task
  const handleAddTask = () => {
    if (tasks.length >= MAX_TASKS) return;

    const newTask: TaskWithId = {
      id: generateTaskId(),
      task_description: '',
      priority: 'Medium',
      due_date: '',
      assigned_to: '',
    };

    setTasks([...tasks, newTask]);
  };

  // Remove a task
  const handleRemoveTask = (taskId: string) => {
    // Don't allow removing the last task
    if (tasks.length === 1) return;

    setTasks(tasks.filter((task) => task.id !== taskId));

    // Clear errors for removed task
    const newErrors = { ...errors };
    delete newErrors[taskId];
    setErrors(newErrors);
  };

  // Update a task
  const handleTaskChange = (taskId: string, updatedTask: TaskFormFieldsData) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...updatedTask } : task)));

    // Clear errors for this task when user makes changes
    if (errors[taskId]) {
      const newErrors = { ...errors };
      delete newErrors[taskId];
      setErrors(newErrors);
    }
  };

  // Submit all tasks
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllTasks()) {
      return;
    }

    if (loading) return; // Prevent double submission

    setLoading(true);
    try {
      // Remove the 'id' field before submitting (it's only for UI tracking)
      const tasksToSubmit = tasks.map(({ id, ...task }) => task);
      await onSubmit(tasksToSubmit);
    } catch (error) {
      console.error('Failed to submit tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Task Forms */}
      <div className="space-y-6">
        {tasks.map((task, index) => (
          <div key={task.id} className="relative">
            {/* Task Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">
                Task {index + 1}
                {tasks.length > 1 && <span className="text-gray-500 ml-2">of {tasks.length}</span>}
              </h4>

              {/* Remove Button - Only show if more than 1 task */}
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTask(task.id)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove task ${index + 1}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              )}
            </div>

            {/* Task Form Fields */}
            <div className="bg-gray-750 rounded-lg p-4 border-2 border-gray-700">
              <TaskFormFields
                formData={task}
                onChange={(updatedTask) => handleTaskChange(task.id, updatedTask)}
                errors={errors[task.id] || {}}
                disabled={loading}
                showLabels={true}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Another Task Button */}
      {tasks.length < MAX_TASKS && (
        <button
          type="button"
          onClick={handleAddTask}
          disabled={loading}
          className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-dashed border-gray-600 hover:border-gray-500"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Another Task ({tasks.length}/{MAX_TASKS})
        </button>
      )}

      {/* Max Tasks Warning */}
      {tasks.length >= MAX_TASKS && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 text-center">
          <p className="text-sm text-yellow-400">
            Maximum of {MAX_TASKS} tasks reached. Submit these tasks or remove some to add more.
          </p>
        </div>
      )}

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
              Creating {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}...
            </>
          ) : (
            <>
              Create {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
