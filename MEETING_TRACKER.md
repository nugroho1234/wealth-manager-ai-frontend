# Meeting Tracker - Frontend Documentation

## Overview

The Meeting Tracker frontend is a modern web application built with Next.js 13+ that provides an intuitive interface for managing meetings, reports, and tasks. It features real-time synchronization with Google Calendar, team collaboration, hierarchical task management, and responsive design for both desktop and mobile devices.

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Pages & Routes](#pages--routes)
5. [Components](#components)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [User Flows](#user-flows)
9. [Responsive Design](#responsive-design)
10. [Setup & Configuration](#setup--configuration)

---

## Features

### Core Features
- **Dashboard**: Overview of meetings, pending reports, and statistics with category breakdown
- **Meetings List**: Comprehensive list with filters (date range, category, status) and team view
- **Meeting Reports**: Structured form for post-meeting outcomes, tasks, and follow-ups
- **Task Management**: Grouped by meeting with priority sections (High/Medium/Low)
- **Team Collaboration**: Leaders can view and manage subordinates' meetings and tasks
- **Quick Actions**: Floating action button for creating meetings and tasks
- **Google Calendar Integration**: OAuth flow for calendar connection
- **Settings**: Telegram notifications, calendar sync, and user preferences

### UI/UX Features
- **Dark Theme**: Modern gray-scale design optimized for professional use
- **Responsive Layout**: Mobile-first design with adaptive components
- **Real-time Updates**: Auto-refresh after actions
- **Smart Filtering**: Persistent filters using localStorage
- **Loading States**: Skeleton screens and loading indicators
- **Error Handling**: User-friendly error messages and fallbacks

### Team Features
- **View Context Banner**: Shows current view (My Data vs Team Data)
- **Team Filter Dropdown**: Switch between personal, team, or specific member views
- **Hierarchy Awareness**: Automatic detection of leadership status
- **Permission-based UI**: Different interfaces for leaders and members

---

## Technology Stack

- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Date Handling**: date-fns
- **Authentication**: JWT tokens with Context API
- **API Client**: Fetch API
- **Routing**: Next.js App Router with dynamic routes

---

## Project Structure

```
src/
├── app/
│   └── meeting-tracker/
│       ├── layout.tsx                          # Meeting tracker layout wrapper
│       ├── dashboard/page.tsx                  # Main dashboard
│       ├── meetings/page.tsx                   # Meetings list
│       ├── tasks/page.tsx                      # Tasks page (grouped by meeting)
│       ├── profile/page.tsx                    # User profile
│       ├── settings/page.tsx                   # User settings
│       ├── form/[meeting_id]/page.tsx          # Meeting report form
│       ├── team/page.tsx                       # Team view (for leaders)
│       └── admin/
│           ├── dashboard/page.tsx              # Admin analytics
│           ├── companies/page.tsx              # Company management
│           ├── companies/new/page.tsx          # Create company
│           ├── companies/[companyId]/edit/page.tsx
│           └── companies/[companyId]/import/page.tsx  # Hierarchy import
│
├── components/meeting-tracker/
│   ├── Sidebar.tsx                    # Navigation sidebar
│   ├── TeamFilter.tsx                 # Team/personal view selector
│   ├── ViewContextBanner.tsx          # Shows current view context
│   ├── FloatingActionButton.tsx       # Quick create FAB
│   ├── QuickCreateModal.tsx           # Modal for quick creation
│   ├── MeetingForm.tsx                # Meeting creation form
│   ├── MultiTaskForm.tsx              # Bulk task creation
│   ├── TaskFormFields.tsx             # Reusable task input fields
│   ├── MeetingDetailModal.tsx         # Meeting details popup
│   ├── MeetingTaskGroup.tsx           # Collapsible meeting group
│   ├── PriorityTaskList.tsx           # Tasks organized by priority
│   ├── TaskItem.tsx                   # Individual task card
│   ├── UpcomingEvents.tsx             # Next 7 days widget
│   ├── MeetingsCategoryChart.tsx      # Pie chart visualization
│   ├── MeetingsCompactList.tsx        # Compact meeting list
│   └── UserSelectorDropdown.tsx       # Select team member
│
└── contexts/
    └── AuthContext.tsx                # Authentication state
```

---

## Pages & Routes

### Public Routes
All routes require authentication and redirect to `/login` if not authenticated.

### Main Application

#### `/meeting-tracker/dashboard`
**Purpose**: Main dashboard with overview and statistics

**Features**:
- Meeting count by category (Sales, Recruitment, New)
- Pending reports count
- Upcoming events (next 7 days)
- Category breakdown chart
- Date range filter (next 7 days, this month, last month, etc.)
- Team filter (for leaders)

**Components**:
- `DashboardContent` - Main page component
- `UpcomingEvents` - Sidebar widget
- `MeetingsCategoryChart` - Pie chart
- `TeamFilter` - View selector

#### `/meeting-tracker/meetings`
**Purpose**: Comprehensive meetings list with filters

**Features**:
- Meeting cards with category badges
- Multiple filters:
  - Date range (this month, last 7 days, custom, etc.)
  - Category (R, N, S, U)
  - Status (scheduled, completed, cancelled)
- Report status indicators
- Quick actions (view details, fill report)
- Pagination/infinite scroll
- Team view (for leaders)

**UI Elements**:
- Category badges with colors:
  - Sales (S) - Blue
  - Recruitment (R) - Green
  - New (N) - Purple
  - Unknown (U) - Gray
- "Fill Report" button for meetings without reports
- "View Report" button for completed reports

#### `/meeting-tracker/tasks`
**Purpose**: Task management page with meeting-based grouping

**Features**:
- **Phase 4-5 Redesign** (Recently Completed):
  - Tasks grouped by associated meeting
  - Collapsible meeting sections
  - Priority-based organization within meetings (High → Medium → Low)
  - Due date sorting within same priority
  - Team view support

**Layout**:
```
Meeting Title (Category Badge) - Date
├─ Pending: 3 | Overdue: 1 (if not all completed)
└─ [Expanded View]
    ├─ HIGH PRIORITY (🔴)
    │   ├─ Task 1 (Due: Jan 30) [✓] [Edit] [Delete]
    │   └─ Task 2 (Due: Feb 1)  [✓] [Edit] [Delete]
    ├─ MEDIUM PRIORITY (🟡)
    │   └─ Task 3 (Due: Feb 5)  [✓] [Edit] [Delete]
    └─ LOW PRIORITY (🟢)
        └─ Task 4 (Due: Feb 10) [✓] [Edit] [Delete]
```

**Filters**:
- Date range (this month, last 7 days, etc.)
- Status (all, pending, in_progress, completed, cancelled)
- Priority (all, high, medium, low)
- Team filter (me, team, specific member)

**Actions**:
- Toggle task completion (checkbox)
- Edit task (opens modal - *Phase 6*)
- Delete task (confirmation dialog)
- View assigned user (in team view)

**Components**:
- `MeetingTaskGroup` - Collapsible meeting container
- `PriorityTaskList` - Priority-based sections
- `TaskItem` - Individual task with responsive design

**Responsive Design**:
- Desktop: Inline edit/delete buttons
- Mobile: Three-dot menu with dropdown

#### `/meeting-tracker/form/[meeting_id]`
**Purpose**: Create or edit meeting report

**Features**:
- Meeting details header (title, time, category)
- Outcome textarea (required)
- Task management:
  - Add multiple tasks
  - Set due date, priority, status
  - Remove tasks
- Follow-up meeting:
  - Toggle follow-up needed
  - Select date and time
  - Add notes
  - Creates Google Calendar event automatically
- Draft vs Final submission
- View-only mode for submitted reports
- Leader view (read-only for subordinates' reports)

**Form Structure**:
```
Meeting Outcome*
└─ Large textarea for outcomes

Tasks
├─ Toggle: "This meeting has tasks"
└─ [If enabled]
    ├─ Task 1 (Title, Due Date, Priority, Status)
    ├─ Task 2 (Title, Due Date, Priority, Status)
    └─ [+ Add Another Task]

Follow-up Meeting
├─ Toggle: "Schedule follow-up meeting"
└─ [If enabled]
    ├─ Date picker
    ├─ Start time
    ├─ End time
    └─ Notes

[Save as Draft] [Submit Report]
```

#### `/meeting-tracker/profile`
**Purpose**: User profile and hierarchy information

**Features**:
- User details (name, email, role)
- Position in hierarchy
- Team name
- Manager information
- Subordinates count (if leader)
- Account settings

#### `/meeting-tracker/settings`
**Purpose**: User preferences and integrations

**Features**:
- **Google Calendar**:
  - Connection status
  - OAuth connect/disconnect
  - Last sync time
  - Sync now button
- **Telegram Notifications**:
  - Bot link with unique token
  - Connection status
  - Test notification
- **Notification Preferences**:
  - Enable/disable specific notification types
  - Daily preview time
  - Daily summary time
  - Task reminder preferences

### Admin Routes

*Note: Only accessible to users with role_id 1 or 2*

#### `/meeting-tracker/admin/companies`
**Purpose**: Manage companies in multi-tenant setup

**Features**:
- Company list with statistics
- Create new company
- Edit company details
- Import hierarchy from CSV
- View company members

#### `/meeting-tracker/admin/companies/[companyId]/import`
**Purpose**: Import organizational hierarchy via CSV

**Features**:
- CSV upload with validation
- Preview import before applying
- Auto-create users option
- Level calculation
- Manager linking
- Error handling and reporting

**CSV Format**:
```csv
Employee Name,Email,Team Name,Position,Manager Email
John Doe,john@example.com,Sales,CEO,
Jane Smith,jane@example.com,Sales,VP Sales,john@example.com
```

---

## Components

### Layout Components

#### `<Sidebar />`
**Purpose**: Main navigation sidebar

**Features**:
- Logo and app name
- Navigation links with icons:
  - Overview (Dashboard)
  - Meetings
  - My Tasks
  - Profile
  - Settings
- Admin section (conditional):
  - Companies
  - Dashboard
- Team badge (shows subordinate count for leaders)
- Logout button
- Mobile hamburger menu
- Active route highlighting

**Props**:
- `children`: ReactNode - Page content

**State**:
- `isOpen`: Mobile menu toggle
- `isLeader`: Leadership status
- `subordinatesCount`: Number of subordinates

#### `<TeamFilter />`
**Purpose**: Switch between personal and team views

**Features**:
- Current view indicator
- Dropdown menu:
  - "My Data" (default)
  - "My Team" (all subordinates)
  - Individual team members
- Leader detection
- Syncs with URL query parameter `?view=...`

**Props**:
- `currentFilter`: string - Current filter value
- `onChange`: (filter: string) => void

#### `<ViewContextBanner />`
**Purpose**: Shows which user's data is being viewed

**Features**:
- Displays banner when viewing team data
- Shows specific team member name when applicable
- Color-coded (yellow background)
- Icon indicator
- Conditionally rendered (only for team view)

**Props**:
- `teamFilter`: string - Current filter
- `isTeamView`: boolean

### Action Components

#### `<FloatingActionButton />`
**Purpose**: Quick create floating action button (bottom-right)

**Features**:
- Fixed position FAB
- Opens `QuickCreateModal`
- Plus icon
- Hover animation
- Accessible (aria-label)

**Props**:
- `onOpenModal`: () => void

#### `<QuickCreateModal />`
**Purpose**: Modal for quick meeting/task creation

**Features**:
- Three-step flow:
  1. Select user (for leaders) or use self
  2. Choose creation type (Meeting or Task)
  3. Fill form and submit
- User selector dropdown (leaders only)
- Meeting form integration
- Multi-task form integration
- Meeting selection dropdown (last 30 days)
- Report validation (tasks require report)
- Bulk task creation
- Loading states
- Error handling
- ESC key to close

**Props**:
- `isOpen`: boolean
- `onClose`: () => void

#### `<MultiTaskForm />`
**Purpose**: Create multiple tasks in one go

**Features**:
- Dynamic task list (add/remove)
- Reuses `TaskFormFields` component
- Validation for all tasks
- Submit all at once (bulk endpoint)
- Minimum 1 task required

**Props**:
- `selectedUserId`: string
- `onSubmit`: (tasks: TaskFormFieldsData[]) => Promise<void>
- `onCancel`: () => void

### Task Components

#### `<MeetingTaskGroup />`
**Purpose**: Collapsible group for tasks under a meeting

**Features**:
- Meeting header with metadata:
  - Title
  - Category badge
  - Date
  - Task summary (pending, overdue, completed)
- Chevron icon (rotate on expand)
- Click to expand/collapse
- Contains `PriorityTaskList`
- Starts collapsed by default
- "All tasks completed" badge (when applicable)

**Props**:
```typescript
{
  meeting: {
    meeting_id: string;
    title: string;
    start_time: string;
    category: string;
  };
  tasks: Task[];
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  allCompleted: boolean;
  onTaskToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  isTeamView: boolean;
}
```

#### `<PriorityTaskList />`
**Purpose**: Organizes tasks by priority within a meeting

**Features**:
- Three priority sections (High, Medium, Low)
- Color-coded headers:
  - High: Red background with 🔴 icon
  - Medium: Yellow background with 🟡 icon
  - Low: Green background with 🟢 icon
- Task count per priority
- Hides empty sections
- Uses `TaskItem` for each task
- Tasks pre-sorted by parent component

**Props**:
```typescript
{
  tasks: Task[];
  onTaskToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  isTeamView?: boolean;
}
```

#### `<TaskItem />`
**Purpose**: Individual task card with actions

**Features**:
- Checkbox for completion toggle
- Task description (strikethrough if completed)
- Due date with overdue indicator (red + warning icon)
- Assigned user (in team view)
- Actions:
  - Desktop: Inline edit and delete buttons
  - Mobile: Three-dot menu with dropdown
- Responsive flex layout
- Hover effects
- Completion animation

**Props**:
```typescript
{
  task: Task;
  onToggle: (taskId: string, newStatus: 'pending' | 'completed') => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  isTeamView?: boolean;
}
```

**Layout**:
- Desktop: `[Checkbox] [Description] [Due Date] [Edit] [Delete]`
- Mobile:
  ```
  [Checkbox] [Description ...]        [Menu ⋮]
             [Due Date]
  ```

### Form Components

#### `<TaskFormFields />`
**Purpose**: Reusable task input fields

**Features**:
- Task description textarea
- Priority selector (high, medium, low)
- Due date picker
- Validation states
- Error messages
- Disabled state support
- Optional labels toggle

**Props**:
```typescript
{
  formData: TaskFormFieldsData;
  onChange: (data: TaskFormFieldsData) => void;
  errors?: {
    task_description?: string;
    priority?: string;
    due_date?: string;
  };
  disabled?: boolean;
  showLabels?: boolean;
}
```

#### `<UserSelectorDropdown />`
**Purpose**: Select team member (for leaders creating tasks/meetings for others)

**Features**:
- Fetches subordinate list
- Displays name and email
- Search/filter capability
- Current user included
- Loading state
- Empty state

**Props**:
```typescript
{
  selectedUserId: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
}
```

### Display Components

#### `<UpcomingEvents />`
**Purpose**: Widget showing next 7 days of meetings

**Features**:
- Grouped by date
- Category badges
- Time display
- Report status icon
- Click to view details or fill report
- Empty state message
- Auto-refresh

**Location**: Sidebar on dashboard

#### `<MeetingsCategoryChart />`
**Purpose**: Pie chart visualization of meeting categories

**Features**:
- Category breakdown:
  - Sales (Blue)
  - Recruitment (Green)
  - New (Purple)
- Percentage labels
- Legend
- Responsive sizing
- Empty state

**Props**:
```typescript
{
  stats: {
    sales_count: number;
    recruitment_count: number;
    new_count: number;
  };
}
```

#### `<MeetingsCompactList />`
**Purpose**: Compact list of recent meetings

**Features**:
- Meeting title truncation
- Category badge
- Date/time
- Report indicator
- Limit to N items
- "View All" link

**Props**:
```typescript
{
  meetings: Meeting[];
  limit?: number;
}
```

---

## State Management

### Authentication State

**Context**: `AuthContext`

**State**:
```typescript
{
  user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role_id: number;
  } | null;
  isAuthenticated: boolean;
}
```

**Methods**:
- `login(email, password)` - Authenticate user
- `logout()` - Clear session
- `refreshToken()` - Refresh access token

**Storage**: JWT tokens in `localStorage` as `auth_tokens`

### Local State Patterns

#### Page-Level State
Each page manages its own state using React hooks:

```typescript
// Example: Tasks Page
const [tasks, setTasks] = useState<Task[]>([]);
const [groupedTasks, setGroupedTasks] = useState<GroupedTasks[]>([]);
const [loading, setLoading] = useState(true);
const [teamFilter, setTeamFilter] = useState('me');
const [statusFilter, setStatusFilter] = useState('all');
const [priorityFilter, setPriorityFilter] = useState('all');
```

#### Persistent Filters
Filters are saved to `localStorage`:

```typescript
// Save filter
localStorage.setItem('tasks_date_range', dateRange);

// Load filter on mount
useEffect(() => {
  const saved = localStorage.getItem('tasks_date_range');
  if (saved) setDateRange(saved);
}, []);
```

**Persisted Keys**:
- `tasks_date_range` - Date filter for tasks page
- `meeting_date_range` - Date filter for dashboard
- `auth_tokens` - JWT access and refresh tokens

#### URL State Sync

Team filter syncs with URL:

```typescript
// Read from URL on mount
useEffect(() => {
  const viewParam = searchParams.get('view');
  if (viewParam) setTeamFilter(viewParam);
}, []);

// Update URL when filter changes
const handleFilterChange = (newFilter: string) => {
  setTeamFilter(newFilter);
  const params = new URLSearchParams(searchParams);
  if (newFilter !== 'me') {
    params.set('view', newFilter);
  } else {
    params.delete('view');
  }
  router.push(`?${params.toString()}`, { scroll: false });
};
```

---

## API Integration

### Base Configuration

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
```

### Authentication Headers

All API calls include JWT token:

```typescript
const authTokens = localStorage.getItem('auth_tokens');
const { access_token: token } = JSON.parse(authTokens);

const response = await fetch(`${API_BASE_URL}/api/v1/...`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Common API Patterns

#### Fetching Data with Filters

```typescript
const fetchTasks = async () => {
  const params = new URLSearchParams();

  // Add filters
  if (statusFilter !== 'all') params.append('status', statusFilter);
  if (priorityFilter !== 'all') params.append('priority', priorityFilter);
  if (teamFilter !== 'me') params.append('team_filter', teamFilter);

  // Add date range
  const { start, end } = getDateRange();
  if (start) params.append('due_from', format(start, 'yyyy-MM-dd'));
  if (end) params.append('due_to', format(end, 'yyyy-MM-dd'));

  const response = await fetch(
    `${API_BASE_URL}/api/v1/meeting-tracker/tasks?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();
  setTasks(data.tasks);
  setStatistics(data.statistics);
};
```

#### Creating Resources

```typescript
const createReport = async (reportData) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/meeting-tracker/reports`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create report');
  }

  return await response.json();
};
```

#### Updating Resources

```typescript
const toggleTaskStatus = async (taskId: string, newStatus: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/meeting-tracker/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    }
  );

  if (!response.ok) throw new Error('Failed to update task');

  // Refresh data
  await fetchTasks();
};
```

#### Error Handling

```typescript
try {
  const response = await fetch(...);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Request failed');
  }

  const data = await response.json();
  // Handle success

} catch (error) {
  console.error('API Error:', error);
  alert(error.message || 'Something went wrong');
}
```

---

## User Flows

### Flow 1: Viewing and Filling Meeting Report

1. User logs in → Dashboard
2. Sees "Pending Reports: 5"
3. Clicks "Meetings" → Meetings page
4. Filters to completed meetings without reports
5. Clicks "Fill Report" on a meeting
6. Redirected to `/meeting-tracker/form/[meeting_id]`
7. Fills out:
   - Meeting outcome (required)
   - Optional: Tasks with due dates and priorities
   - Optional: Follow-up meeting
8. Clicks "Submit Report"
9. Backend creates:
   - Meeting report
   - Tasks (if any)
   - Follow-up Google Calendar event (if requested)
10. Success message + redirect to meetings page
11. Meeting now shows "View Report" instead of "Fill Report"

### Flow 2: Managing Tasks

1. User clicks "My Tasks" in sidebar
2. Tasks page loads, grouped by meeting
3. Filters tasks:
   - Date range: "This Month"
   - Status: "Pending"
   - Priority: "High"
4. Sees meeting groups with high-priority pending tasks
5. Clicks meeting header to expand
6. Views tasks organized by priority (High → Medium → Low)
7. Checks checkbox on a task to mark complete
8. Task updates with strikethrough
9. Statistics update (Pending: 11 → 10, Completed: 5 → 6)
10. If all tasks in meeting completed, banner shows "All tasks completed"

### Flow 3: Leader Viewing Team Data

1. Leader logs in (has subordinates)
2. Sees Team Filter dropdown in header
3. Current: "My Data"
4. Clicks dropdown → Selects "My Team"
5. Yellow banner appears: "You are viewing: My Team"
6. URL updates to `?view=team`
7. Dashboard refreshes with aggregated team data
8. All pages (Meetings, Tasks) now show team data
9. Task cards show "Assigned to: John Doe"
10. Leader can view but not edit subordinates' reports (read-only)
11. Leader can create tasks for subordinates via Quick Create modal

### Flow 4: Quick Task Creation

1. User clicks floating + button (bottom-right)
2. Quick Create Modal opens
3. Step 1: Select user (leaders) or skip (regular users)
4. Step 2: Choose "Create Task"
5. Meeting selector appears (last 30 days of completed meetings with reports)
6. Selects a meeting
7. Multi-task form appears
8. Adds 3 tasks:
   - Task 1: "Send proposal" | High | Due: Jan 30
   - Task 2: "Follow up email" | Medium | Due: Feb 5
   - Task 3: "Schedule demo" | Low | Due: Feb 10
9. Clicks "Create Tasks"
10. Backend creates all 3 tasks linked to selected meeting
11. Success message: "3 tasks created successfully!"
12. Modal closes, Tasks page auto-refreshes

### Flow 5: Google Calendar Connection

1. User goes to Settings
2. Sees "Google Calendar: Not Connected"
3. Clicks "Connect Google Calendar"
4. Redirected to Google OAuth consent screen
5. Grants calendar permissions
6. Redirected back to Settings with success message
7. Status changes to "Connected"
8. Last sync time displayed
9. Hourly background job syncs meetings automatically
10. User can click "Sync Now" for manual sync
11. New meetings appear in Meetings page within minutes

### Flow 6: Using Telegram Bot Commands

**Prerequisites**: User must have connected Telegram account via Settings

#### Command: `/meetings`
1. User opens Telegram bot
2. Types `/meetings`
3. Bot responds with:
   - Personalized greeting with user's first name
   - List of upcoming meetings (max 10)
   - Each meeting shows:
     - Meeting title
     - Date and time (Asia/Jakarta timezone)
     - Category with emoji (👔 Recruitment, ✨ New, 💼 Sales, 📌 Uncategorized)
   - Link to view all meetings in app
4. If no meetings: Shows friendly "no meetings" message

#### Command: `/tasks`
1. User types `/tasks` in Telegram
2. Bot responds with:
   - Personalized greeting
   - Tasks grouped by priority:
     - 🔴 HIGH PRIORITY
     - 🟡 MEDIUM PRIORITY
     - 🟢 LOW PRIORITY
   - Each task shows:
     - Task title
     - Due date
     - ⚠️ OVERDUE indicator (if past due)
     - 📌 TODAY indicator (if due today)
   - Link to manage tasks in app
3. If no tasks: Shows congratulatory "no pending tasks" message

#### Command: `/help`
1. User types `/help`
2. Bot responds with:
   - List of all available commands
   - Getting started guide
   - Notification schedule
   - Link to app

#### Account Not Linked Flow
1. User tries any command before linking account
2. Bot responds with:
   - "Account Not Linked" message
   - Instructions to link via Settings page
   - Direct link to Settings

---

## Responsive Design

### Breakpoints

Tailwind CSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile Adaptations

#### Sidebar
- **Desktop**: Persistent sidebar (left side)
- **Mobile**: Hamburger menu, slides in from left

#### Task Item
- **Desktop**:
  ```
  [✓] Task description... | Due: Jan 30 | [Edit] [Delete]
  ```
- **Mobile**:
  ```
  [✓] Task description...  [⋮]
      Due: Jan 30

  [⋮] Dropdown:
      - Edit
      - Delete
  ```

#### Meeting Cards
- **Desktop**: 3-column grid
- **Tablet**: 2-column grid
- **Mobile**: Single column

#### Dashboard
- **Desktop**:
  ```
  [Stats Row] [Chart]
  [Meetings] [Upcoming Events Sidebar]
  ```
- **Mobile**:
  ```
  [Stats Stack]
  [Chart]
  [Upcoming Events]
  [Meetings]
  ```

### Touch Optimizations

- Larger tap targets (min 44x44px)
- Swipe-friendly cards
- No hover-dependent interactions
- Touch-friendly dropdowns
- Bottom-sheet modals on mobile

---

## Setup & Configuration

### Environment Variables

Create `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: Enable debug logging
NEXT_PUBLIC_DEBUG=true
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Dependencies

Key packages in `package.json`:

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "date-fns": "^2.30.0"
  }
}
```

### Development Workflow

1. **Start Backend**: Ensure backend is running on port 8000
2. **Start Frontend**: `npm run dev` (runs on port 3000)
3. **Hot Reload**: Changes auto-refresh in browser
4. **TypeScript**: Compilation errors shown in terminal
5. **Linting**: Run `npm run lint` before committing

### Building for Production

```bash
# Build optimized bundle
npm run build

# Test production build locally
npm start

# Deploy to Vercel/Netlify/etc
# (Follow platform-specific instructions)
```

---

## Styling Guidelines

### Color Palette

**Dark Theme** (Default):
- Background: `bg-gray-900`
- Cards: `bg-gray-800`
- Borders: `border-gray-700`
- Text: `text-white`, `text-gray-300`, `text-gray-400`

**Category Colors**:
- Sales (S): `bg-blue-500 text-white`
- Recruitment (R): `bg-green-500 text-white`
- New (N): `bg-purple-500 text-white`
- Unknown (U): `bg-gray-500 text-white`

**Priority Colors**:
- High: `bg-red-900/30 border-red-700 text-red-400`
- Medium: `bg-yellow-900/30 border-yellow-700 text-yellow-400`
- Low: `bg-green-900/30 border-green-700 text-green-400`

**Status Colors**:
- Pending: `text-blue-400`
- In Progress: `text-yellow-400`
- Completed: `text-green-400`
- Cancelled: `text-gray-500`
- Overdue: `text-red-400`

### Component Classes

Reusable Tailwind classes:

```typescript
// Buttons
const PRIMARY_BUTTON = "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors";
const SECONDARY_BUTTON = "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors";

// Cards
const CARD = "bg-gray-800 rounded-xl border border-gray-700 p-4";

// Inputs
const INPUT = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
```

---

## Testing

### Manual Testing Checklist

- [ ] Login/logout flow
- [ ] Dashboard loads with correct stats
- [ ] Meetings list with filters
- [ ] Create meeting report with tasks
- [ ] View existing report (read-only)
- [ ] Toggle task completion
- [ ] Delete task (with confirmation)
- [ ] Team filter (for leaders)
- [ ] View subordinate's data
- [ ] Quick create modal (meeting + task)
- [ ] Google Calendar connection
- [ ] Telegram notification setup
- [ ] Mobile responsive layout
- [ ] Filters persist across sessions
- [ ] Error handling (network failures)

### Browser Compatibility

Tested on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Troubleshooting

### Tasks Not Showing

**Symptom**: Tasks page shows "No tasks found" even though tasks exist

**Causes**:
1. Backend response missing `meetings` field (should be flattened from `meeting_reports.meetings`)
2. Tasks don't have associated meeting report
3. Filters too restrictive

**Solutions**:
1. Check backend response includes flattened `meetings` data
2. Verify task has `report_id` linking to valid meeting
3. Reset filters to "All"

### Team Filter Not Working

**Symptom**: Selecting "My Team" shows no data or errors

**Causes**:
1. User not in hierarchy (not a leader)
2. No subordinates in hierarchy
3. Backend hierarchy endpoint failing

**Solutions**:
1. Check `/api/v1/meeting-tracker/hierarchy/me` returns `is_leader: true`
2. Import hierarchy via Admin → Companies → Import
3. Check console for API errors

### Google Calendar Not Syncing

**Symptom**: New meetings don't appear after calendar connection

**Causes**:
1. Calendar sync job not running
2. OAuth token expired
3. Sync errors in backend logs

**Solutions**:
1. Manually trigger sync from Settings → "Sync Now"
2. Disconnect and reconnect Google Calendar
3. Check backend logs for sync job errors
4. Verify cron job is running (`calendar_sync.py`)

### Mobile Menu Not Closing

**Symptom**: Sidebar stays open on mobile after navigation

**Solution**: Add click handler to close menu on route change:

```typescript
useEffect(() => {
  setIsOpen(false);
}, [pathname]);
```

---

## Future Enhancements

- [ ] **Phase 6**: Task edit modal with pre-filled data
- [ ] **Phase 7**: Loading skeletons, error boundaries, toast notifications
- [ ] **Phase 8**: Comprehensive testing suite
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Advanced search/filtering
- [ ] Calendar view for tasks
- [ ] Gantt chart for project tracking
- [ ] Export data (CSV, PDF)
- [ ] Bulk task operations
- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Email notifications (alternative to Telegram)
- [ ] Real-time collaboration (WebSocket)

---

## Support & Contributing

For issues and feature requests, contact the development team.

**Version**: 1.0.0
**Last Updated**: January 2026
