# Wealth Manager AI - Frontend

A unified Next.js 15 frontend platform for insurance and financial advisory teams, featuring **Oracle (WealthTalk AI)** for insurance product management and **Meeting Tracker** for team coordination.

## 🎯 Platform Overview

This modern web application provides two complementary interfaces:

1. **Oracle (WealthTalk AI)** - AI-powered insurance product search, proposal generation, and CRM
2. **Meeting Tracker** - Google Calendar integration, meeting reports, and task management

Both applications share a seamless navigation experience with a single sign-on authentication system.

## 📚 Documentation

### Feature Documentation
- **[Oracle (WealthTalk AI) Documentation](ORACLE.md)** - Insurance product management and proposals
- **[Meeting Tracker Documentation](MEETING_TRACKER.md)** - Meeting reports and task tracking

### Quick Links
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Application Routes](#application-routes)
- [Key Features](#key-features)
- [Deployment](#deployment)
- [Support](#support)

---

## 🏗️ Architecture

### Multi-Application Platform

```
wealth-manager-frontend/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── login/                 # Shared authentication
│   │   ├── oracle/                # Oracle (WealthTalk AI)
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── proposals/
│   │   │   ├── clients/
│   │   │   ├── chat/
│   │   │   ├── admin/
│   │   │   └── profile/
│   │   └── meeting-tracker/       # Meeting Tracker
│   │       ├── dashboard/
│   │       ├── meetings/
│   │       ├── reports/
│   │       ├── tasks/
│   │       ├── team/
│   │       └── form/
│   ├── components/
│   │   ├── Sidebar.tsx            # Shared navigation
│   │   ├── ProtectedRoute.tsx     # Auth wrapper
│   │   ├── meeting-tracker/       # Meeting components
│   │   └── oracle/                # Oracle components
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Shared auth state
│   │   └── NotificationContext.tsx
│   ├── lib/
│   │   └── api.ts                 # API client
│   ├── types/                     # TypeScript types
│   └── styles/                    # Global styles
├── ORACLE.md                       # Oracle docs
├── MEETING_TRACKER.md              # Meeting Tracker docs
└── README.md                       # This file
```

### Shared Infrastructure

**Authentication**:
- Passwordless OTP login via email
- JWT token management with automatic refresh
- 3-day session persistence
- Role-based navigation

**UI Framework**:
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Responsive mobile-first design

**State Management**:
- React Context API for global state
- React Hooks for local state
- URL state for pagination and filters

**API Integration**:
- Axios-based HTTP client
- Automatic JWT token injection
- Request/response interceptors
- Error handling with toast notifications

---

## 🚀 Tech Stack

### Core Framework
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Gradient Design System** - Modern gradient backgrounds
- **Glass-morphism Effects** - Translucent UI elements
- **Responsive Design** - Mobile-first approach

### State Management
- **React Context API** - Global state (auth, notifications)
- **React Hooks** - Local component state
- **URL State** - Pagination and filters

### API & Data
- **Axios** - HTTP client with interceptors
- **React Hot Toast** - Toast notifications
- **date-fns** - Date formatting

### Form Handling
- **Controlled Components** - React-managed forms
- **Client-side Validation** - Real-time validation

### Other Libraries
- **React Markdown** - Markdown rendering (chat)
- **remark-gfm** - GitHub Flavored Markdown

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see backend README)
- Environment variables configured

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/nugroho1234/wealth-manager-ai-frontend.git
cd wealth-manager-ai-frontend
```

2. **Install dependencies**:
```bash
npm install
# or
yarn install
```

3. **Configure environment variables**:

Create `.env.local` file:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Wealth Manager AI

# Application Settings
NEXT_PUBLIC_ENVIRONMENT=development
```

4. **Run development server**:
```bash
npm run dev
# or
yarn dev
```

Application available at: `http://localhost:3000`

---

## 🛣️ Application Routes

### Shared Routes
```
/login                          # Passwordless OTP login
```

### Oracle (WealthTalk AI) Routes
```
/oracle/dashboard               # Main dashboard with stats
/oracle/products                # AI product search & catalog
/oracle/products/compare        # Compare up to 5 products
/oracle/proposals               # Proposal management
/oracle/proposals/create        # Create new proposal
/oracle/proposals/[id]          # Proposal details
/oracle/proposals/[id]/preview  # PDF preview
/oracle/clients                 # Client management (CRM)
/oracle/clients/[id]            # Client details & policies
/oracle/chat                    # AI assistant
/oracle/profile                 # User profile
/oracle/notifications           # Notification center

# Admin Routes (ADMIN+ only)
/oracle/admin/users             # User management
/oracle/admin/invitations       # Email invitations
/oracle/admin/products          # Product management
/oracle/admin/documents         # Document library
/oracle/admin/commissions       # Commission rates
/oracle/admin/companies         # Company management (MASTER only)
```

### Meeting Tracker Routes
```
/meeting-tracker/dashboard      # Overview with statistics
/meeting-tracker/meetings       # Calendar view & list
/meeting-tracker/reports        # Meeting reports
/meeting-tracker/reports/[id]   # Report details
/meeting-tracker/tasks          # Task management
/meeting-tracker/tasks/grouped  # Tasks grouped by meeting
/meeting-tracker/team           # Team hierarchy
/meeting-tracker/form/[id]      # Post-meeting form
/meeting-tracker/settings       # Calendar settings
```

**Total Routes**: 30+ pages across both applications

---

## 🎨 Key Features

### Oracle (WealthTalk AI)

**AI-Powered Product Search**:
- Semantic search with natural language queries
- Similarity scoring with matched content highlights
- Category filtering with automatic fallback
- Manual search with filters (category, provider)

**Proposal Generation**:
- Multi-step creation wizard
- PDF illustration upload and processing
- AI-generated professional proposals
- Real-time status tracking (draft → extracting → reviewing → generating → completed)
- PDF preview and download

**Client Management (CRM)**:
- Complete client database with search and pagination
- Policy tracking with status management
- Policy document upload to private storage
- Client portfolio statistics (premiums, coverage)
- Tag-based organization

**Product Comparison**:
- Side-by-side comparison (up to 5 products)
- Feature-by-feature breakdown
- Commission rate display
- Export to PDF

**AI Chat Assistant**:
- Session-based chat for specific products
- Markdown-formatted responses
- Context-aware product information
- Session management (rename, archive, delete)

**Modern UI/UX**:
- Gradient backgrounds with modern design
- Responsive mobile-first layout
- Glass-morphism effects
- Real-time notifications
- Loading states and progress indicators

**Read More**: [ORACLE.md](ORACLE.md)

### Meeting Tracker

**Google Calendar Integration**:
- OAuth 2.0 authentication
- Incremental sync with sync tokens
- Real-time webhook notifications
- Automatic meeting status updates

**Meeting Management**:
- Calendar view and list view
- AI-powered category detection
- Meeting details with participants
- Google Meet link integration
- Upcoming and past meetings

**Meeting Reports**:
- Structured report templates
- Markdown editor with preview
- Key discussion points tracking
- Decisions and next steps
- Form link generation

**Task Management**:
- Create tasks from meetings
- Priority levels (High, Medium, Low)
- Due date tracking with overdue indicators
- Task status (Pending, In Progress, Completed)
- Two view modes:
  - **Meeting-grouped**: Tasks organized by meeting
  - **Priority-grouped**: Tasks organized by priority

**Team Hierarchy**:
- CSV import for team structure
- Visual team tree
- Multi-level organization
- Team member filtering

**Notifications**:
- 8 types of automated Telegram notifications
- Daily summaries and previews
- Task reminders
- Form completion reminders
- Customizable notification settings

**Modern UI/UX**:
- Dark theme design
- Responsive layout
- Real-time updates
- Badge counters
- Loading skeletons

**Read More**: [MEETING_TRACKER.md](MEETING_TRACKER.md)

---

## 👥 Multi-Tenancy & Roles

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **MASTER** | 1 | Platform owner, all permissions |
| **SUPER_ADMIN** | 2 | Company owner, company-wide access |
| **ADMIN** | 3 | Company admin, user management |
| **LEADER_1** | 4 | Senior team leader |
| **LEADER_2** | 5 | Junior team leader |
| **SENIOR_PARTNER** | 6 | Senior advisor |
| **ADVISOR** | 7 | Standard advisor |

### Role-Based Navigation

The sidebar dynamically shows/hides menu items based on user role:

**Everyone**:
- Dashboard
- Search Products (Oracle)
- Chat (Oracle)
- Proposals (Oracle)
- Meetings (Meeting Tracker)
- Reports (Meeting Tracker)
- Tasks (Meeting Tracker)

**ADVISOR+** (Advisor and above):
- My Clients (Oracle)

**ADMIN+** (Admin, Super Admin, Master):
- Admin section
  - Manage Users
  - Manage Invitations
  - Manage Products
  - Manage Documents
  - Commission Rates

**MASTER only**:
- Company Management

### Application Switcher

Users can seamlessly switch between Oracle and Meeting Tracker via sidebar:
```
Switch to Meeting Tracker (from Oracle)
Switch to Oracle (from Meeting Tracker)
```

---

## 🔧 Component Architecture

### Shared Components

**`<Sidebar>`**:
- Main navigation for both applications
- Collapsible on desktop
- Hamburger menu on mobile
- Active route highlighting
- Role-based menu items
- Application switcher

**`<ProtectedRoute>`**:
- Authentication wrapper
- Redirect to login if not authenticated
- Role-based access control
- Loading state during auth check

### Oracle Components

Located in `src/components/oracle/`:
- Product cards
- Proposal forms
- Client cards
- Policy management
- Chat interface

### Meeting Tracker Components

Located in `src/components/meeting-tracker/`:
- **MeetingTaskGroup** - Meeting with tasks
- **PriorityTaskList** - Tasks by priority
- **TaskItem** - Individual task card
- **MeetingCard** - Meeting list item
- **ReportForm** - Report editor
- **TaskForm** - Task creation/edit
- **Sidebar** - Navigation menu
- **CalendarView** - Calendar grid
- **TeamHierarchy** - Team tree view

---

## 🚀 Deployment

### Vercel (Recommended)

**Why Vercel?**:
- Optimized for Next.js
- Automatic deployments from Git
- Preview deployments for PRs
- Edge network (CDN)
- Zero configuration

**Steps**:

1. **Connect GitHub repository** to Vercel
2. **Configure environment variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_APP_NAME=Wealth Manager AI
   NEXT_PUBLIC_ENVIRONMENT=production
   ```
3. **Deploy**:
   - Automatic on push to `main` branch
   - Preview on pull requests

**Custom Domain** (optional):
- Add custom domain in Vercel dashboard
- Configure DNS (A/CNAME records)
- SSL automatically provisioned

### Manual Deployment

**Build**:
```bash
npm run build
# or
yarn build
```

**Start production server**:
```bash
npm start
# or
yarn start
```

**Requirements**:
- Node.js 18+ runtime
- Environment variables configured
- Backend API accessible

---

## 🎨 Design System

### Color Palette

**Oracle (WealthTalk AI)**:
- Primary: Blue gradient (`from-blue-500 to-purple-600`)
- Background: Light gray (`from-gray-50 to-white`)
- Accent: Green (success), Red (error), Yellow (warning)

**Meeting Tracker**:
- Primary: Dark theme (`bg-gray-900`)
- Accent: Blue (`blue-500`)
- Priority colors:
  - High: Red (`red-700`)
  - Medium: Yellow (`yellow-700`)
  - Low: Green (`green-700`)

### Typography

- **Headings**: `font-bold` with sizes `text-3xl`, `text-2xl`, `text-xl`
- **Body**: `text-base` or `text-sm`
- **Labels**: `text-xs` with `uppercase` and `font-semibold`

### Spacing

- **Page margins**: `px-6 py-8` or `px-4 py-6` (mobile)
- **Card padding**: `p-6` or `p-4` (mobile)
- **Section gaps**: `space-y-6` or `space-y-4`

### Responsive Breakpoints

- **sm**: 640px (Small tablets)
- **md**: 768px (Tablets)
- **lg**: 1024px (Laptops)
- **xl**: 1280px (Desktops)
- **2xl**: 1536px (Large desktops)

---

## 📊 Version History

### Version 1.3.0 (January 2026)

**New Features**:
- Multi-application navigation system
- Seamless switching between Oracle and Meeting Tracker
- Consolidated sidebar with role-based menus
- Enhanced company management UI
- Dashboard statistics with role-specific metrics
- User activation/deactivation interface

**Meeting Tracker UI**:
- Complete meeting tracker interface
- Calendar view and list view
- Report creation and editing
- Task management with two view modes
- Team hierarchy visualization
- Settings and notification preferences

**Oracle Improvements**:
- Enhanced client management interface
- Policy management with document upload
- Improved search and filtering
- Product comparison mobile warnings

### Version 1.2.0 (January 2026)

**New Features**:
- Client Management System (CRM)
- Client detail pages with policy lists
- Policy document upload interface
- Client portfolio statistics
- Tag-based client organization

### Version 1.1.0 (December 2025)

**New Features**:
- Products pagination
- User management interface
- Profile completion indicators
- Admin panel enhancements

### Version 1.0.0 (November 2025)

**Initial Release**:
- Passwordless OTP authentication
- AI-powered product search
- Proposal generation interface
- Product comparison tool
- Admin portal
- Responsive design

---

## 🛠️ Development

### Project Structure

```
wealth-manager-frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable components
│   ├── contexts/               # React contexts
│   ├── lib/                    # Utilities and API client
│   ├── types/                  # TypeScript type definitions
│   └── styles/                 # Global styles
├── public/                     # Static assets
├── .env.local                  # Environment variables
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
├── ORACLE.md                  # Oracle documentation
├── MEETING_TRACKER.md         # Meeting Tracker docs
└── README.md                  # This file
```

### Running Tests

```bash
# Run all tests
npm test
# or
yarn test

# Run with coverage
npm run test:coverage
# or
yarn test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint
# or
yarn lint

# Format code
npm run format
# or
yarn format

# Type check
npm run type-check
# or
yarn type-check
```

### Building for Production

```bash
# Create production build
npm run build
# or
yarn build

# Analyze bundle size
npm run analyze
# or
yarn analyze
```

---

## 📖 API Integration

### API Client

Located in `src/lib/api.ts`:

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
```

### Making API Calls

```typescript
// GET request
const response = await apiClient.get('/api/v1/oracle/products');

// POST request
const response = await apiClient.post('/api/v1/oracle/proposals', data);

// PUT request
const response = await apiClient.put('/api/v1/oracle/clients/${id}', data);

// DELETE request
const response = await apiClient.delete('/api/v1/oracle/proposals/${id}');

// File upload
const formData = new FormData();
formData.append('file', file);
const response = await apiClient.post('/api/v1/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🔒 Security

### Best Practices

- **Never commit** `.env.local` or sensitive data to Git
- **Use HTTPS** in production for API calls
- **Sanitize** user inputs before rendering
- **Validate** data on both client and server
- **Store** JWT tokens securely in localStorage
- **Implement** CSRF protection for forms
- **Rate limit** API requests

### XSS Prevention

- Use React's built-in XSS protection (JSX escaping)
- Sanitize user-generated content before rendering
- Avoid `dangerouslySetInnerHTML` unless necessary
- Validate and sanitize Markdown content

---

## 🤝 Support

### Getting Help

1. **Check Documentation**:
   - [Oracle Documentation](ORACLE.md)
   - [Meeting Tracker Documentation](MEETING_TRACKER.md)
   - [Next.js Documentation](https://nextjs.org/docs)

2. **Common Issues**:
   - API connection errors: Check `NEXT_PUBLIC_API_URL`
   - Authentication issues: Clear localStorage and re-login
   - Build errors: Delete `.next` folder and rebuild

3. **Contact**:
   - Create an issue in the GitHub repository
   - Contact the development team

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Proprietary - Internal use only

---

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Vercel** - Hosting platform
- **Tailwind CSS** - CSS framework
- **React** - UI library
- **TypeScript** - Type safety

---

**Maintained By**: Wealth Manager AI Development Team

**Last Updated**: January 2026

**Version**: 1.3.0
