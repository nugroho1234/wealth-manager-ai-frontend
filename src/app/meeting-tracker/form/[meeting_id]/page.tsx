'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Task {
  title: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'in_progress' | 'done';
}

interface Meeting {
  meeting_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  category: string;
  user_id: string;
}

interface Report {
  report_id: string;
  meeting_outcome: string;
  has_tasks: boolean;
  follow_up_needed: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  is_draft: boolean;
}

function FormContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meeting_id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [existingReport, setExistingReport] = useState<Report | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLeaderView, setIsLeaderView] = useState(false); // True if viewing subordinate's report

  // Form state
  const [meetingOutcome, setMeetingOutcome] = useState('');
  const [hasTasks, setHasTasks] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpStartTime, setFollowUpStartTime] = useState('');
  const [followUpEndTime, setFollowUpEndTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Error state
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMeetingAndReport();
  }, []);

  const fetchMeetingAndReport = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        router.push('/auth/login');
        return;
      }
      const { access_token: token } = JSON.parse(authTokens);

      // Fetch meeting details
      const meetingRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meetingRes.ok) throw new Error('Failed to fetch meeting');

      const meetingData = await meetingRes.json();
      const fetchedMeeting = meetingData.meeting;
      setMeeting(fetchedMeeting);

      // Check if current user is viewing someone else's report (leader view)
      const isViewingAsLeader = fetchedMeeting.user_id !== user?.user_id;
      setIsLeaderView(isViewingAsLeader);

      // Try to fetch existing report
      try {
        const reportRes = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/reports/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (reportRes.ok) {
          const reportData = await reportRes.json();
          const report = reportData.report;
          const existingTasks = reportData.tasks || [];

          setExistingReport(report);
          setMeetingOutcome(report.meeting_outcome || '');
          setHasTasks(report.has_tasks || false);
          setTasks(existingTasks.map((t: any) => ({
            title: t.title,
            due_date: t.due_date.split('T')[0], // Convert to YYYY-MM-DD
            priority: t.priority || 'medium',
            status: t.status
          })));
          setFollowUpNeeded(report.follow_up_needed || false);
          setFollowUpDate(report.follow_up_date ? report.follow_up_date.split('T')[0] : '');
          setFollowUpStartTime(report.follow_up_start_time || '');
          setFollowUpEndTime(report.follow_up_end_time || '');
          setFollowUpNotes(report.follow_up_notes || '');

          // Determine view mode:
          // 1. If viewing as leader (not the owner), always read-only
          // 2. If report is finalized (not a draft), read-only for owner too
          if (isViewingAsLeader || (fetchedMeeting.has_report && !report.is_draft)) {
            setIsViewMode(true);
          }
        }
      } catch (reportError) {
        // No existing report, that's fine
        console.log('No existing report found');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load meeting data');
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    setTasks([...tasks, { title: '', due_date: '', priority: 'medium', status: 'in_progress' }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: keyof Task, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = async (isDraft: boolean) => {
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!meetingOutcome.trim()) {
        setError('Meeting outcome is required');
        setSaving(false);
        return;
      }

      if (hasTasks && tasks.length === 0) {
        setError('Please add at least one task or select "No" for tasks');
        setSaving(false);
        return;
      }

      if (hasTasks) {
        for (let i = 0; i < tasks.length; i++) {
          if (!tasks[i].title.trim() || !tasks[i].due_date) {
            setError(`Task ${i + 1}: Title and due date are required`);
            setSaving(false);
            return;
          }
        }
      }

      if (followUpNeeded && (!followUpDate || !followUpStartTime || !followUpEndTime)) {
        setError('Follow-up date, start time, and end time are required when follow-up is needed');
        setSaving(false);
        return;
      }

      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) {
        router.push('/auth/login');
        return;
      }
      const { access_token: token } = JSON.parse(authTokens);

      // Prepare request body
      const body = {
        meeting_id: meetingId,
        meeting_outcome: meetingOutcome,
        has_tasks: hasTasks,
        tasks: hasTasks ? tasks : [],
        follow_up_needed: followUpNeeded,
        follow_up_date: followUpNeeded && followUpDate ? followUpDate : null,
        follow_up_start_time: followUpNeeded && followUpStartTime ? followUpStartTime : null,
        follow_up_end_time: followUpNeeded && followUpEndTime ? followUpEndTime : null,
        follow_up_notes: followUpNeeded && followUpNotes ? followUpNotes : null,
        is_draft: isDraft,
      };

      // Submit report
      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save report');
      }

      const data = await res.json();

      // Show success message
      if (isDraft) {
        alert('Draft saved successfully! You can continue editing later.');
      } else {
        let message = 'Meeting report submitted successfully!';
        if (data.follow_up_created) {
          message += '\n\nFollow-up meeting has been created in your Google Calendar.';
        }
        alert(message);
      }

      // Redirect to dashboard
      router.push('/meeting-tracker/dashboard');
    } catch (error: any) {
      console.error('Error saving report:', error);
      setError(error.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-gray-400 text-xl">Loading...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  if (!meeting) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-red-400 text-xl">Meeting not found</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Leader View Indicator */}
          {isLeaderView && (
            <div className="mb-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👁️</span>
                <div>
                  <p className="text-blue-300 font-semibold">Viewing Team Member's Report</p>
                  <p className="text-blue-400/80 text-sm">You are viewing this report in read-only mode as a team leader.</p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {isViewMode ? 'View Report' : existingReport?.is_draft ? 'Continue Draft Report' : 'Fill Report'}
            </h1>
            <div className="text-gray-400">
              <p className="text-lg font-medium">{meeting.title}</p>
              <p className="text-sm">
                {format(new Date(meeting.start_time), 'EEEE, MMMM d, yyyy • h:mm a')} -{' '}
                {format(new Date(meeting.end_time), 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
            {/* Meeting Outcome */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Meeting Outcome <span className="text-red-400">*</span>
              </label>
              <textarea
                value={meetingOutcome}
                onChange={(e) => setMeetingOutcome(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                placeholder="Describe the key outcomes from this meeting..."
                disabled={isViewMode}
              />
            </div>

            {/* Tasks to Complete */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Tasks to Complete?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasTasks"
                    checked={hasTasks}
                    onChange={() => setHasTasks(true)}
                    className="w-4 h-4 text-blue-500"
                    disabled={isViewMode}
                  />
                  <span className="text-gray-300">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasTasks"
                    checked={!hasTasks}
                    onChange={() => {
                      setHasTasks(false);
                      setTasks([]);
                    }}
                    className="w-4 h-4 text-blue-500"
                    disabled={isViewMode}
                  />
                  <span className="text-gray-300">No</span>
                </label>
              </div>

              {/* Task List */}
              {hasTasks && (
                <div className="mt-4 space-y-4">
                  {tasks.map((task, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">
                              Task Title <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTask(index, 'title', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                              placeholder="Enter task title..."
                              disabled={isViewMode}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Due Date <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="date"
                                value={task.due_date}
                                onChange={(e) => updateTask(index, 'due_date', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isViewMode}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Priority</label>
                              <select
                                value={task.priority}
                                onChange={(e) => updateTask(index, 'priority', e.target.value as 'high' | 'medium' | 'low')}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isViewMode}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
                              <select
                                value={task.status}
                                onChange={(e) => updateTask(index, 'status', e.target.value as 'in_progress' | 'done')}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isViewMode}
                              >
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {!isViewMode && (
                          <button
                            onClick={() => removeTask(index)}
                            className="mt-6 text-red-400 hover:text-red-300 p-2"
                            type="button"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!isViewMode && (
                    <button
                      onClick={addTask}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Task
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Follow-up Needed */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Follow-up Needed?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="followUpNeeded"
                    checked={followUpNeeded}
                    onChange={() => setFollowUpNeeded(true)}
                    className="w-4 h-4 text-blue-500"
                    disabled={isViewMode}
                  />
                  <span className="text-gray-300">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="followUpNeeded"
                    checked={!followUpNeeded}
                    onChange={() => {
                      setFollowUpNeeded(false);
                      setFollowUpDate('');
                      setFollowUpStartTime('');
                      setFollowUpEndTime('');
                      setFollowUpNotes('');
                    }}
                    className="w-4 h-4 text-blue-500"
                    disabled={isViewMode}
                  />
                  <span className="text-gray-300">No</span>
                </label>
              </div>

              {/* Follow-up Fields */}
              {followUpNeeded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Follow-up Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Start Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={followUpStartTime}
                        onChange={(e) => setFollowUpStartTime(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isViewMode}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        End Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={followUpEndTime}
                        onChange={(e) => setFollowUpEndTime(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Follow-up Notes <span className="text-gray-500">(Optional)</span>
                    </label>
                    <textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                      placeholder="Add any notes for the follow-up meeting..."
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isViewMode && (
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="flex-1 px-6 py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          )}

          {isViewMode && (
            <div className="mt-8">
              <button
                onClick={() => router.push('/meeting-tracker/dashboard')}
                className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </MeetingTrackerSidebar>
  );
}

export default function FormPage() {
  return (
    <ProtectedRoute>
      <FormContent />
    </ProtectedRoute>
  );
}
