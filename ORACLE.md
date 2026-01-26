# Oracle (WealthTalk AI) - Frontend Documentation

A professional, AI-powered insurance product search and proposal generation platform for insurance advisors and teams.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Pages & Routes](#pages--routes)
5. [Key Features](#key-features)
6. [Component Library](#component-library)
7. [User Flows](#user-flows)
8. [State Management](#state-management)
9. [API Integration](#api-integration)
10. [Multi-Tenancy & Roles](#multi-tenancy--roles)
11. [Responsive Design](#responsive-design)
12. [Setup & Configuration](#setup--configuration)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Oracle (also known as WealthTalk AI) is a comprehensive web application designed for insurance advisors to:

- **Search Insurance Products** - AI-powered semantic search and manual filtering
- **Generate Proposals** - Professional, branded PDF proposals with illustrations
- **Manage Clients** - Complete CRM system for client and policy management
- **Chat with Products** - Interactive AI assistant for product inquiries
- **Admin Portal** - User management, invitations, and company settings

**Target Users**: Insurance advisors, team leaders, administrators, and super admins across multiple companies.

---

## Technology Stack

### Core Framework
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 18** - UI library with hooks

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Gradient Design System** - Modern gradient backgrounds
- **Responsive Design** - Mobile-first approach

### State Management
- **React Context API** - Global state (auth, notifications)
- **React Hooks** - Local component state (useState, useEffect, useCallback)

### API & Data
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Toast notifications
- **date-fns** - Date formatting and manipulation

### Form Handling
- **Controlled Components** - React-managed form state
- **Client-side Validation** - Real-time input validation

### Routing
- **Next.js App Router** - File-based routing with `/app` directory
- **Dynamic Routes** - `[id]` and `[meeting_id]` patterns
- **Search Params** - URL query parameters for state

### Other Libraries
- **React Markdown** - Markdown rendering in chat
- **remark-gfm** - GitHub Flavored Markdown support

---

## Project Structure

```
wealth-manager-frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── oracle/            # Oracle feature routes
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── products/      # Product search & catalog
│   │   │   ├── proposals/     # Proposal management
│   │   │   ├── clients/       # Client management
│   │   │   ├── chat/          # AI assistant
│   │   │   ├── admin/         # Admin portal
│   │   │   ├── profile/       # User profile
│   │   │   └── notifications/ # Notification center
│   │   └── meeting-tracker/   # Meeting Tracker feature
│   ├── components/            # Reusable components
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── ProtectedRoute.tsx # Auth wrapper
│   │   └── ...                # Other components
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── NotificationContext.tsx # Notification state
│   ├── lib/                   # Utilities
│   │   └── api.ts            # API client
│   ├── types/                 # TypeScript types
│   │   ├── auth.ts           # Auth types
│   │   └── client.ts         # Client types
│   └── styles/                # Global styles
├── public/                    # Static assets
├── .env.local                 # Environment variables
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

---

## Pages & Routes

### Main Application Routes

#### `/oracle/dashboard`
**Purpose**: Main landing page with role-based statistics and quick actions.

**Features**:
- Role-based dashboard stats (users, companies, products, proposals)
- Quick action buttons (Create Proposal, Search Products, etc.)
- Recent activity feed
- Gradient background with modern card design

**Access**: All authenticated users

**Key Components**:
```typescript
// Dashboard statistics
interface DashboardStats {
  users_count?: number;
  companies_count?: number;
  products_count?: number;
  proposals_count?: number;
  search_queries_count?: number;
  chat_sessions_count?: number;
  clients_count?: number;
  active_policies_count?: number;
}
```

#### `/oracle/products`
**Purpose**: Search and explore insurance products using AI or manual filters.

**Features**:
- **AI Search Tab**:
  - Semantic search with natural language queries
  - Category filtering (Life, Health, Investment, Travel, Property, All)
  - Similarity scoring with matched content highlights
  - Product selection for comparison (up to 5 products)
  - Category fallback warnings

- **Manual Search Tab**:
  - Search by product name
  - Filter by category and provider
  - Browse all available products
  - Real-time search and filtering

- **Product Actions**:
  - View product details
  - Compare products side-by-side
  - Chat with product AI
  - Edit product (ADMIN only)

**Access**: All authenticated users

**Key Interfaces**:
```typescript
interface Product {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
  key_features: string;
  created_at: string;
  processing_status: string;
  pdf_url?: string;
  similarity_score?: number;      // AI search only
  matched_content?: string;       // AI search only
}
```

#### `/oracle/products/compare`
**Purpose**: Side-by-side comparison of up to 5 insurance products.

**Features**:
- Comparison table with key attributes
- Visual similarity scores (AI search)
- Feature-by-feature breakdown
- Export comparison to PDF
- Create proposal from comparison

**Access**: All authenticated users (requires product selection)

#### `/oracle/proposals`
**Purpose**: Manage insurance proposals with creation and tracking.

**Features**:
- **Two Tabs**:
  - **List Tab**: View all proposals with search and status filters
  - **Create Tab**: Multi-step proposal creation form

- **Proposal Creation Flow**:
  1. Select proposal type (Single Product, Comparison, Custom)
  2. Enter client information
  3. Upload PDF illustrations (optional)
  4. Review and generate

- **Proposal List**:
  - Search by client name or insurance name
  - Filter by status (draft, extracting, reviewing, generating, completed, failed)
  - Status indicators with icons
  - Delete proposals
  - View proposal details

**Access**: All authenticated users

**Key Interfaces**:
```typescript
interface ProposalListItem {
  proposal_id: string;
  client_name: string;
  proposal_type: string;
  status: string;
  illustration_count: number;
  highlighted_insurance_name?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  extracting: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  generating: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};
```

#### `/oracle/proposals/[id]`
**Purpose**: View and edit proposal details.

**Features**:
- View proposal metadata
- Edit client information
- Add/remove illustrations
- Preview PDF illustrations
- Generate final PDF proposal
- Track processing status

**Access**: Proposal owner or ADMIN

#### `/oracle/proposals/[id]/illustrations`
**Purpose**: Manage PDF illustrations for a proposal.

**Features**:
- Upload new illustrations
- View extracted data (cash values, premiums, etc.)
- Delete illustrations
- Reprocess failed extractions

**Access**: Proposal owner or ADMIN

#### `/oracle/proposals/[id]/preview`
**Purpose**: Preview and download final PDF proposal.

**Features**:
- Full-screen PDF preview
- Download branded proposal
- Share proposal link
- Regenerate proposal

**Access**: Proposal owner or ADMIN

#### `/oracle/clients`
**Purpose**: Manage insurance clients and their policies.

**Features**:
- **Client List**:
  - Search by name, email, or phone
  - Filter: All Clients, With Policies, Without Policies
  - Pagination (12 clients per page)
  - Client statistics (Total, With Policies, Without Policies)

- **Add Client**:
  - Required: First name, Last name, Date of birth
  - Optional: Email, Phone, Gender, Address, Tags, Notes

- **Client Actions**:
  - View client details
  - Edit client information
  - Delete client (with policy cascade warning)

**Access**: ADVISOR, LEADER_1, LEADER_2, SENIOR_PARTNER, ADMIN, SUPER_ADMIN, MASTER

**Key Interfaces**:
```typescript
interface ClientListItem {
  client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | 'other';
  total_policies: number;
  active_policies: number;
  total_monthly_premium: number;
  total_coverage: number;
  created_at: string;
  tags?: string[];
}
```

#### `/oracle/clients/[id]`
**Purpose**: Client detail page with policy management.

**Features**:
- **Client Information**:
  - Personal details
  - Contact information
  - Private notes
  - Tags

- **Policy Management**:
  - List all policies (Active, Lapsed, Expired, Pending)
  - Add new policy
  - Edit policy details
  - Upload policy documents
  - Delete policy
  - Policy statistics (Total Premium, Total Coverage)

- **Policy Actions**:
  - View policy document
  - Download policy PDF
  - Track policy status
  - Manage renewal dates

**Access**: Policy owner (ADVISOR) or team leaders (LEADER_1, LEADER_2, SENIOR_PARTNER)

**Key Interfaces**:
```typescript
interface Policy {
  policy_id: string;
  policy_number?: string;
  insurance_id: string;
  insurance_name: string;
  provider: string;
  active_date: string;
  expiry_date?: string;
  premium_period: 'monthly' | 'yearly' | 'one_time';
  premium_amount: number;
  coverage_amount: number;
  policy_status: 'active' | 'lapsed' | 'expired' | 'pending';
  policy_document_url?: string;
  policy_document_filename?: string;
  notes?: string;
}
```

#### `/oracle/chat`
**Purpose**: AI-powered assistant for product inquiries.

**Features**:
- **Session Management**:
  - Create new chat sessions for products
  - List active and archived sessions
  - Rename sessions
  - Archive/unarchive sessions
  - Delete sessions

- **Chat Interface**:
  - Real-time messaging with AI
  - Markdown-formatted responses
  - Context-aware product information
  - Message history with pagination
  - Typing indicators

- **Product Selector**:
  - Search and select products to chat about
  - Handle product from URL parameter (from Products page)
  - Archive existing sessions before creating new ones

**Access**: All authenticated users

**Key Interfaces**:
```typescript
interface ChatMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sequence_number: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'deleted';
  metadata?: Record<string, any>;
}

interface ChatSession {
  session_id: string;
  user_id: string;
  insurance_id: string;
  session_name: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
}
```

#### `/oracle/profile`
**Purpose**: User profile management.

**Features**:
- View and edit personal information
- Update phone number
- View role and company
- Profile completion status

**Access**: All authenticated users

#### `/oracle/notifications`
**Purpose**: Notification center for system updates.

**Features**:
- View all notifications
- Mark as read/unread
- Filter by type
- Delete notifications

**Access**: All authenticated users

### Admin Routes (ADMIN, SUPER_ADMIN, MASTER only)

#### `/oracle/admin/users`
**Purpose**: User management and administration.

**Features**:
- **User List**:
  - Search by name, email, or phone
  - Filter: Active users, Inactive users
  - Pagination (20 users per page)
  - User statistics

- **User Actions**:
  - Edit user details (name, phone, role)
  - Activate/deactivate users
  - View user profile completion status

- **Multi-Tenancy**:
  - MASTER sees all users across all companies
  - SUPER_ADMIN/ADMIN see only their company users

**Access**: ADMIN, SUPER_ADMIN, MASTER

**Key Interfaces**:
```typescript
interface User {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  company_id: string | null;
  is_profile_complete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  deactivated_at: string | null;
}

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'LEADER_1', label: 'Leader 1' },
  { value: 'LEADER_2', label: 'Leader 2' },
  { value: 'ADVISOR', label: 'Advisor' },
  { value: 'SENIOR_PARTNER', label: 'Senior Partner' }
];
```

#### `/oracle/admin/invitations`
**Purpose**: Manage email invitations for new users.

**Features**:
- View pending invitations
- Add new allowed emails
- Remove invitations
- Assign roles to invitations

**Access**: ADMIN, SUPER_ADMIN, MASTER

#### `/oracle/admin/invitations/manage`
**Purpose**: Bulk invitation management.

**Features**:
- Bulk add emails
- CSV import
- Set default role for batch invitations

**Access**: SUPER_ADMIN, MASTER

#### `/oracle/admin/products`
**Purpose**: Product catalog management.

**Features**:
- Add new insurance products
- Edit product details
- Mark products as discontinued
- Upload product PDFs

**Access**: ADMIN, SUPER_ADMIN, MASTER

#### `/oracle/admin/documents`
**Purpose**: Document library management.

**Features**:
- Upload PDF insurance documents
- Process documents with LlamaParse
- View document processing status
- Delete documents

**Access**: ADMIN, SUPER_ADMIN, MASTER

#### `/oracle/admin/commissions`
**Purpose**: Commission rate management.

**Features**:
- View commission rates by role
- Edit commission percentages
- Set product-specific commissions

**Access**: SUPER_ADMIN, MASTER

#### `/oracle/admin/commissions/[insurance_id]`
**Purpose**: Product-specific commission configuration.

**Features**:
- Set commission rates for specific product
- Override default role-based rates
- View commission history

**Access**: SUPER_ADMIN, MASTER

#### `/oracle/admin/companies`
**Purpose**: Company management (MASTER only).

**Features**:
- View all companies
- Add new companies
- Edit company details
- Assign company admins

**Access**: MASTER only

---

## Key Features

### 1. AI-Powered Product Search

**Semantic Search**:
- Natural language queries (e.g., "life insurance with critical illness coverage")
- Similarity scoring with matched content highlights
- Category filtering with automatic fallback
- Top 50 most relevant results

**Implementation**:
```typescript
// AI Search with similarity threshold
const handleAiSearch = async (e?: React.FormEvent) => {
  e?.preventDefault();

  if (!aiQuery.trim()) {
    notifyError('Search Error', 'Please enter a search query');
    return;
  }

  try {
    setIsAiSearching(true);

    const params = new URLSearchParams({
      query: aiQuery.trim(),
      category: aiCategory,
      limit: '50',
      similarity_threshold: '0.0'
    });

    const response = await apiClient.get<SearchResult>(
      `/api/v1/oracle/search?${params.toString()}`
    );

    setAiResults(response.data.data.results);
    setCategoryFallback(response.data.data.category_fallback || false);
    setRequestedCategory(response.data.data.requested_category || null);
  } catch (error: any) {
    notifyError('Search Error', error.detail || 'Failed to search products');
  } finally {
    setIsAiSearching(false);
  }
};
```

### 2. Product Comparison

**Features**:
- Select up to 5 products for side-by-side comparison
- Mobile warning (comparison works best on desktop)
- Visual similarity scores (AI search)
- Feature-by-feature comparison table

**Implementation**:
```typescript
// Product selection state
const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
const [showMobileWarning, setShowMobileWarning] = useState(false);

// Toggle product selection
const toggleProductSelection = (productId: string) => {
  const newSelection = new Set(selectedProducts);

  if (newSelection.has(productId)) {
    newSelection.delete(productId);
  } else {
    if (newSelection.size >= 5) {
      notifyError('Selection Limit', 'You can compare up to 5 products at once');
      return;
    }
    newSelection.add(productId);
  }

  setSelectedProducts(newSelection);
};

// Navigate to comparison
const handleCompare = () => {
  if (selectedProducts.size < 2) {
    notifyError('Selection Error', 'Please select at least 2 products to compare');
    return;
  }

  // Check if mobile
  if (window.innerWidth < 1024) {
    setShowMobileWarning(true);
    return;
  }

  const productIds = Array.from(selectedProducts).join(',');
  router.push(`/oracle/products/compare?products=${productIds}`);
};
```

### 3. Proposal Generation

**Multi-Step Process**:
1. **Select Proposal Type**: Single Product, Comparison, Custom
2. **Enter Client Information**: Name, email, phone, etc.
3. **Upload PDF Illustrations**: Optional product illustrations
4. **Review & Generate**: AI-powered proposal generation

**Processing Statuses**:
- `draft` - Initial creation
- `extracting` - LlamaParse extracting data from PDFs
- `reviewing` - Waiting for user review
- `generating` - AI generating proposal content
- `completed` - PDF ready for download
- `failed` - Error occurred

**Implementation**:
```typescript
// Proposal creation
const createProposal = async (data: ProposalCreateData) => {
  try {
    const response = await apiClient.post('/api/v1/oracle/proposals', data);

    if (response.data.success) {
      const proposalId = response.data.data.proposal_id;
      notifySuccess('Proposal Created', 'Redirecting to proposal details...');

      // Navigate to proposal page
      setTimeout(() => {
        router.push(`/oracle/proposals/${proposalId}`);
      }, 1000);
    }
  } catch (error: any) {
    notifyError('Creation Failed', error.detail || 'Failed to create proposal');
  }
};
```

### 4. Client & Policy Management

**Client Features**:
- Search, filter, and pagination
- Add/edit/delete clients
- Tag-based categorization
- Private notes

**Policy Features**:
- Link insurance products to clients
- Track policy status (Active, Lapsed, Expired, Pending)
- Upload policy documents to private bucket
- Calculate total premiums and coverage

**Auto-Generated Filenames**:
```
Format: DDMMYYYY-firstname-lastname-insurance-name.pdf
Example: 15012026-john-doe-prudential-life-assurance.pdf
```

**Implementation**:
```typescript
// Upload policy document
const handleUploadDocument = async (policyId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post(
      `/api/v1/clients/${clientId}/policies/${policyId}/upload-document`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.data.success) {
      notifySuccess('Success', 'Policy document uploaded successfully');
      loadPolicies(); // Refresh policy list
    }
  } catch (error: any) {
    notifyError('Upload Failed', error.detail || 'Failed to upload document');
  }
};
```

### 5. AI Chat Assistant

**Session-Based Chat**:
- Create chat sessions for specific insurance products
- Archive old sessions before creating new ones
- Rename sessions for organization
- View session history

**Features**:
- Real-time messaging with AI
- Markdown-formatted responses (tables, lists, bold, links)
- Context-aware product information
- Typing indicators
- Message pagination

**Implementation**:
```typescript
// Send message to AI
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!inputMessage.trim() || !currentSession) return;

  try {
    setIsSendingMessage(true);
    setIsTyping(true);

    const response = await apiClient.post<SendMessageResponse>(
      '/api/v1/oracle/chat/message',
      {
        session_id: currentSession.session_id,
        message: inputMessage.trim()
      }
    );

    if (response.data.success) {
      // Add user message
      setMessages(prev => [...prev, response.data.user_message]);

      // Add assistant message if available
      if (response.data.assistant_message) {
        setMessages(prev => [...prev, response.data.assistant_message]);
      }

      setInputMessage('');
      scrollToBottom();
    }
  } catch (error: any) {
    notifyError('Message Failed', error.detail || 'Failed to send message');
  } finally {
    setIsSendingMessage(false);
    setIsTyping(false);
  }
};
```

### 6. Multi-Tenancy & Role-Based Access

**Role Hierarchy** (highest to lowest):
1. **MASTER** - Platform owner, all permissions
2. **SUPER_ADMIN** - Company owner, company-wide admin
3. **ADMIN** - Company admin, user management
4. **LEADER_1** - Team leader (senior)
5. **LEADER_2** - Team leader (junior)
6. **SENIOR_PARTNER** - Senior advisor
7. **ADVISOR** - Standard advisor

**Access Control**:
- Admins see only their company users
- Advisors see only their own clients and proposals
- Leaders can view team members' data
- MASTER sees all companies

**Implementation**:
```typescript
// Role-based navigation
const mainNavigationItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/oracle/dashboard',
    icon: '🏠',
  },
  {
    name: 'My Clients',
    href: '/oracle/clients',
    icon: '👥',
    requiredRoles: [
      UserRole.ADVISOR,
      UserRole.LEADER_1,
      UserRole.LEADER_2,
      UserRole.SENIOR_PARTNER,
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MASTER
    ],
  },
];

// Check access
const hasAccess = (item: SidebarItem): boolean => {
  if (!item.requiredRoles || !user) return true;
  return item.requiredRoles.includes(user.role as UserRole);
};
```

---

## Component Library

### Layout Components

#### `<Sidebar>`
**Purpose**: Main navigation sidebar for Oracle application.

**Props**:
```typescript
interface SidebarProps {
  children: React.ReactNode;
}
```

**Features**:
- Collapsible sidebar (desktop)
- Mobile hamburger menu
- Active route highlighting
- Role-based navigation items
- Logout action
- Switch between Oracle and Meeting Tracker

**Usage**:
```typescript
<Sidebar>
  <YourPageContent />
</Sidebar>
```

#### `<ProtectedRoute>`
**Purpose**: Authentication wrapper for protected pages.

**Props**:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}
```

**Features**:
- Redirect to login if not authenticated
- Role-based access control
- Loading state during auth check

**Usage**:
```typescript
export default function Page() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <Sidebar>
        <AdminContent />
      </Sidebar>
    </ProtectedRoute>
  );
}
```

### Form Components

#### `<CreateProposalForm>`
**Purpose**: Multi-step form for creating new proposals.

**Props**:
```typescript
interface CreateProposalFormProps {
  onSuccess: (proposalId: string) => void;
}
```

**Features**:
- Step-by-step wizard
- Form validation
- File upload for illustrations
- Client information input
- Proposal type selection

**Usage**:
```typescript
<CreateProposalForm
  onSuccess={(proposalId) => router.push(`/oracle/proposals/${proposalId}`)}
/>
```

### Utility Components

#### `<LoadingSpinner>`
**Purpose**: Loading indicator for async operations.

**Usage**:
```typescript
{isLoading && <LoadingSpinner />}
```

#### `<EmptyState>`
**Purpose**: Empty state placeholder with icon and message.

**Props**:
```typescript
interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Usage**:
```typescript
<EmptyState
  icon="📋"
  title="No Proposals Yet"
  message="Create your first proposal to get started"
  action={{
    label: 'Create Proposal',
    onClick: () => setActiveTab('create')
  }}
/>
```

---

## User Flows

### Flow 1: Search Products and Create Proposal

**Scenario**: Advisor searches for life insurance products and creates a proposal for a client.

**Steps**:
1. Navigate to **Products** page
2. Select **AI Search** tab
3. Enter query: "life insurance with critical illness coverage for 40-year-old"
4. Review search results with similarity scores
5. Select 2-3 relevant products (checkbox)
6. Click **Compare Selected** button
7. Review comparison table on **Compare** page
8. Click **Create Proposal from Selection**
9. Fill in client information (name, email, phone, age, coverage amount)
10. Upload product illustration PDFs (optional)
11. Click **Generate Proposal**
12. Wait for status to change: `draft` → `extracting` → `reviewing` → `generating` → `completed`
13. Click **Preview** to view PDF
14. Download and send to client

**Key Pages**: Products → Compare → Proposals (Create) → Proposal Detail → Preview

### Flow 2: Manage Client and Add Policy

**Scenario**: Advisor adds a new client and records their existing policy.

**Steps**:
1. Navigate to **My Clients** page
2. Click **Add Client** button
3. Fill in client information:
   - First Name: John
   - Last Name: Doe
   - Date of Birth: 1985-05-15
   - Email: john.doe@example.com
   - Phone: +6281234567890
   - Gender: Male
   - Tags: VIP, High Net Worth
4. Click **Save Client**
5. Click on client card to view details
6. In **Policies** section, click **Add Policy**
7. Select insurance product from dropdown
8. Fill in policy details:
   - Policy Number: PL-2026-001234
   - Active Date: 2024-01-01
   - Premium Period: Monthly
   - Premium Amount: 5,000,000 (IDR)
   - Coverage Amount: 500,000,000 (IDR)
   - Policy Status: Active
9. Upload policy document (PDF)
10. Click **Save Policy**
11. View policy in client's policy list with auto-generated filename

**Key Pages**: Clients → Client Detail (with Policy Management)

### Flow 3: Chat with Product AI

**Scenario**: Advisor wants to learn more about a specific insurance product's features and benefits.

**Steps**:
1. Navigate to **Products** page
2. Search for "Prudential PRULink Assurance"
3. Click **Chat** icon on product card
4. Modal appears: "You have active chat sessions. Archive existing session?"
5. Click **Archive & Create New** (if existing session) or **Create Session** (if no active session)
6. Redirected to **Chat** page with new session
7. Type message: "What are the investment options available?"
8. AI responds with detailed information about investment funds
9. Ask follow-up: "What is the minimum premium?"
10. AI provides premium details
11. Ask: "How does the policy surrender value work?"
12. AI explains surrender value calculation
13. Rename session: "PRULink Investment Options"
14. Continue conversation or archive session

**Key Pages**: Products → Chat (with Product Context)

### Flow 4: Admin User Management

**Scenario**: Admin wants to add a new advisor to the system and manage existing users.

**Steps**:
1. Navigate to **Admin → Invitations**
2. Click **Add Allowed Email**
3. Enter new advisor's email: newadvisor@company.com
4. Select role: **ADVISOR**
5. Click **Save**
6. Advisor receives OTP email and completes registration
7. Navigate to **Admin → Users**
8. Search for new advisor by name or email
9. Click **Edit** on advisor's row
10. Update phone number and other details
11. Change role from ADVISOR to LEADER_2 (if promoted)
12. Click **Save Changes**
13. (Optional) Deactivate inactive users by clicking **Deactivate**

**Key Pages**: Admin → Invitations → Admin → Users

### Flow 5: Generate Proposal from Comparison

**Scenario**: Advisor compares multiple products and generates a customized proposal.

**Steps**:
1. Navigate to **Products** page
2. Use **Manual Search** to find products
3. Select category: "Life Insurance"
4. Select 3 products for comparison (checkboxes)
5. Click **Compare Selected Products**
6. Review comparison table with features, premiums, coverage
7. Click **Create Proposal from Comparison**
8. Proposal creation form opens with selected products pre-filled
9. Fill in client information:
   - Client Name: Sarah Lee
   - Age: 35
   - Email: sarah.lee@example.com
   - Coverage Amount: 1,000,000,000 (IDR)
10. Upload illustration PDFs for each product
11. Add custom notes: "Client prefers investment-linked products"
12. Click **Generate Proposal**
13. Wait for PDF extraction and proposal generation
14. Review generated proposal in Preview page
15. Download PDF and send to client via email

**Key Pages**: Products → Compare → Proposals (Create) → Proposal Detail → Illustrations → Preview

---

## State Management

### Global State (React Context)

#### AuthContext
**Purpose**: Manage authentication state and user information.

**State**:
```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

**Usage**:
```typescript
const { user, isAuthenticated, logout } = useAuth();

if (!isAuthenticated) {
  router.push('/login');
}
```

#### NotificationContext
**Purpose**: Manage toast notifications and unread count.

**State**:
```typescript
interface NotificationContextType {
  unreadCount: number;
  notifySuccess: (title: string, message: string) => void;
  notifyError: (title: string, message: string) => void;
  notifyInfo: (title: string, message: string) => void;
  notifyWarning: (title: string, message: string) => void;
}
```

**Usage**:
```typescript
const { notifySuccess, notifyError } = useNotifications();

try {
  await apiClient.post('/api/v1/oracle/proposals', data);
  notifySuccess('Success', 'Proposal created successfully');
} catch (error) {
  notifyError('Error', 'Failed to create proposal');
}
```

### Local State (React Hooks)

**Common Patterns**:

1. **Data Fetching**:
```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/oracle/endpoint');
      setData(response.data.data);
    } catch (err: any) {
      setError(err.detail || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

2. **Search with Debounce**:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [results, setResults] = useState<Result[]>([]);

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.trim()) {
      fetchResults(searchQuery);
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [searchQuery]);
```

3. **Pagination**:
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [itemsPerPage] = useState(20);

const offset = (currentPage - 1) * itemsPerPage;

useEffect(() => {
  fetchData(itemsPerPage, offset);
}, [currentPage]);
```

4. **Form Handling**:
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: ''
});
const [isSubmitting, setIsSubmitting] = useState(false);

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setIsSubmitting(true);
    await apiClient.post('/api/v1/oracle/endpoint', formData);
    notifySuccess('Success', 'Data saved successfully');
  } catch (error) {
    notifyError('Error', 'Failed to save data');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## API Integration

### API Client Configuration

**File**: `src/lib/api.ts`

**Features**:
- Axios instance with base URL
- Automatic JWT token injection
- Request/response interceptors
- Error handling and formatting

**Setup**:
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    // Format error for easy handling
    const formattedError = {
      status_code: error.response?.status,
      detail: error.response?.data?.detail || error.message,
      data: error.response?.data
    };

    return Promise.reject(formattedError);
  }
);

export { apiClient };
export default apiClient;
```

### Common API Patterns

#### 1. GET Request (List)
```typescript
const fetchProducts = async () => {
  try {
    const params = new URLSearchParams({
      limit: '20',
      offset: '0',
      category: 'Life Insurance',
      search: 'prudential'
    });

    const response = await apiClient.get<{
      success: boolean;
      data: {
        products: Product[];
        total: number;
      };
    }>(`/api/v1/oracle/products?${params.toString()}`);

    if (response.data.success) {
      setProducts(response.data.data.products);
      setTotal(response.data.data.total);
    }
  } catch (error: any) {
    notifyError('Error', error.detail || 'Failed to fetch products');
  }
};
```

#### 2. POST Request (Create)
```typescript
const createClient = async (clientData: ClientCreateData) => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: { client: Client };
      message: string;
    }>('/api/v1/clients', clientData);

    if (response.data.success) {
      notifySuccess('Success', 'Client created successfully');
      return response.data.data.client;
    }
  } catch (error: any) {
    notifyError('Error', error.detail || 'Failed to create client');
    throw error;
  }
};
```

#### 3. PUT Request (Update)
```typescript
const updateUser = async (userId: string, userData: UpdateUserData) => {
  try {
    const response = await apiClient.put(
      `/api/v1/oracle/admin/users/${userId}`,
      userData
    );

    if (response.data.success) {
      notifySuccess('Success', 'User updated successfully');
    }
  } catch (error: any) {
    notifyError('Error', error.detail || 'Failed to update user');
  }
};
```

#### 4. DELETE Request
```typescript
const deleteProposal = async (proposalId: string) => {
  try {
    const response = await apiClient.delete(
      `/api/v1/oracle/proposals/${proposalId}`
    );

    if (response.data.success) {
      notifySuccess('Success', 'Proposal deleted successfully');
    }
  } catch (error: any) {
    notifyError('Error', error.detail || 'Failed to delete proposal');
  }
};
```

#### 5. File Upload (FormData)
```typescript
const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post(
      '/api/v1/clients/${clientId}/policies/${policyId}/upload-document',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.data.success) {
      notifySuccess('Success', 'Document uploaded successfully');
    }
  } catch (error: any) {
    notifyError('Error', error.detail || 'Failed to upload document');
  }
};
```

---

## Multi-Tenancy & Roles

### Role Hierarchy

**7-Tier Role System**:

| Role | Level | Permissions |
|------|-------|-------------|
| **MASTER** | 1 (Highest) | Platform owner, all permissions, see all companies |
| **SUPER_ADMIN** | 2 | Company owner, manage company users and settings |
| **ADMIN** | 3 | Company admin, user management, product management |
| **LEADER_1** | 4 | Senior team leader, view team data |
| **LEADER_2** | 5 | Junior team leader, view team data |
| **SENIOR_PARTNER** | 6 | Senior advisor, all advisor features |
| **ADVISOR** | 7 (Lowest) | Standard advisor, own clients and proposals |

### Permission Matrix

| Feature | ADVISOR | SENIOR_PARTNER | LEADER_2 | LEADER_1 | ADMIN | SUPER_ADMIN | MASTER |
|---------|---------|----------------|----------|----------|-------|-------------|--------|
| Search Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Proposals | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Own Clients | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Team Data | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage Products | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage Invitations | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Change User Roles | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage Companies | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| View All Companies | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Multi-Tenancy Implementation

**Company Isolation**:
- All data (clients, proposals, users) scoped by `company_id`
- Backend enforces Row Level Security (RLS) policies
- Frontend filters data based on user's company

**Example - Client List**:
```typescript
// ADVISOR: See only own clients
// LEADER_1/2: See team clients (via team hierarchy)
// ADMIN/SUPER_ADMIN: See all company clients
// MASTER: See all clients across all companies

const fetchClients = async () => {
  try {
    // Backend automatically filters by company_id and user role
    const response = await apiClient.get<ClientListResponse>('/api/v1/clients');

    if (response.data.success) {
      setClients(response.data.data.clients); // Already filtered by backend
    }
  } catch (error: any) {
    notifyError('Error', 'Failed to load clients');
  }
};
```

**Role-Based UI Rendering**:
```typescript
// Show admin menu only for ADMIN+
{(user?.role === 'ADMIN' ||
  user?.role === 'SUPER_ADMIN' ||
  user?.role === 'MASTER') && (
  <div className="admin-menu">
    <Link href="/oracle/admin/users">Manage Users</Link>
    <Link href="/oracle/admin/products">Manage Products</Link>
  </div>
)}

// Show clients menu only for ADVISOR+
{(user?.role === 'ADVISOR' ||
  user?.role === 'LEADER_1' ||
  user?.role === 'LEADER_2' ||
  user?.role === 'SENIOR_PARTNER' ||
  user?.role === 'ADMIN' ||
  user?.role === 'SUPER_ADMIN' ||
  user?.role === 'MASTER') && (
  <Link href="/oracle/clients">My Clients</Link>
)}
```

---

## Responsive Design

### Breakpoints

**Tailwind CSS Breakpoints**:
- `sm`: 640px (Small tablets)
- `md`: 768px (Tablets)
- `lg`: 1024px (Laptops)
- `xl`: 1280px (Desktops)
- `2xl`: 1536px (Large desktops)

### Mobile-First Approach

**Strategy**: Design for mobile first, then enhance for larger screens.

**Example - Product Card**:
```typescript
<div className="
  w-full                    // Mobile: Full width
  sm:w-1/2                  // Tablet: 2 columns
  lg:w-1/3                  // Desktop: 3 columns
  xl:w-1/4                  // Large: 4 columns
  p-4                       // Consistent padding
">
  <ProductCard />
</div>
```

### Responsive Navigation

**Desktop**:
- Collapsible sidebar
- Always visible navigation
- Hover effects

**Mobile**:
- Hamburger menu
- Full-screen overlay menu
- Touch-optimized buttons

**Implementation**:
```typescript
// Desktop sidebar (always visible, collapsible)
<div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col">
  <Sidebar />
</div>

// Mobile menu (hamburger)
<div className="lg:hidden">
  <button onClick={() => setIsMobileMenuOpen(true)}>
    <HamburgerIcon />
  </button>
</div>

// Mobile menu overlay
{isMobileMenuOpen && (
  <div className="fixed inset-0 z-50 lg:hidden">
    <MobileSidebar onClose={() => setIsMobileMenuOpen(false)} />
  </div>
)}
```

### Responsive Tables

**Desktop**: Full table with all columns
**Mobile**: Card-based layout

**Example - User List**:
```typescript
// Desktop table
<div className="hidden md:block">
  <table className="min-w-full">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {users.map(user => (
        <tr key={user.user_id}>
          <td>{user.first_name} {user.last_name}</td>
          <td>{user.email}</td>
          <td>{user.role}</td>
          <td>{user.is_active ? 'Active' : 'Inactive'}</td>
          <td><EditButton /></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

// Mobile cards
<div className="md:hidden space-y-4">
  {users.map(user => (
    <div key={user.user_id} className="bg-white rounded-lg shadow p-4">
      <div className="font-medium">{user.first_name} {user.last_name}</div>
      <div className="text-sm text-gray-600">{user.email}</div>
      <div className="text-sm text-gray-600">{user.role}</div>
      <div className="mt-2">
        <span className={`badge ${user.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="mt-3">
        <EditButton />
      </div>
    </div>
  ))}
</div>
```

### Mobile Warnings

**Comparison Feature**:
```typescript
// Warn users on mobile that comparison works best on desktop
const handleCompare = () => {
  if (selectedProducts.size < 2) {
    notifyError('Selection Error', 'Please select at least 2 products');
    return;
  }

  // Check screen width
  if (window.innerWidth < 1024) {
    setShowMobileWarning(true);
    return;
  }

  navigateToComparison();
};

// Mobile warning modal
{showMobileWarning && (
  <Modal>
    <h3>Desktop Recommended</h3>
    <p>Product comparison works best on desktop or tablet screens.</p>
    <button onClick={() => navigateToComparison()}>
      Continue Anyway
    </button>
    <button onClick={() => setShowMobileWarning(false)}>
      Cancel
    </button>
  </Modal>
)}
```

---

## Setup & Configuration

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see Backend ORACLE.md)
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
NEXT_PUBLIC_APP_NAME=WealthTalk AI

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

### Production Build

1. **Build the application**:
```bash
npm run build
# or
yarn build
```

2. **Start production server**:
```bash
npm start
# or
yarn start
```

### Deployment (Vercel)

**Recommended Platform**: Vercel (optimized for Next.js)

1. **Connect GitHub repository** to Vercel
2. **Configure environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` - Production backend URL
   - `NEXT_PUBLIC_APP_NAME` - Application name
   - `NEXT_PUBLIC_ENVIRONMENT` - `production`

3. **Deploy**:
   - Automatic deployment on push to `main` branch
   - Preview deployments for pull requests

**Custom Domain** (optional):
- Add custom domain in Vercel dashboard
- Configure DNS settings
- SSL certificate automatically provisioned

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Yes | `https://api.wealthtalk.ai` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | No | `WealthTalk AI` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment name | No | `production` |

---

## Troubleshooting

### Common Issues

#### 1. API Connection Errors

**Symptom**: "Failed to fetch" or "Network Error" when calling APIs.

**Causes**:
- Backend not running
- Wrong `NEXT_PUBLIC_API_URL`
- CORS issues

**Solutions**:
```bash
# Check backend is running
curl http://localhost:8000/health

# Verify environment variable
echo $NEXT_PUBLIC_API_URL

# Check CORS configuration in backend
# Ensure frontend URL is in CORS_ORIGINS
```

#### 2. Authentication Issues

**Symptom**: Redirected to login page repeatedly, "Unauthorized" errors.

**Causes**:
- Expired JWT token
- Invalid token in localStorage
- Backend authentication service down

**Solutions**:
```typescript
// Clear localStorage and re-login
localStorage.removeItem('auth_token');
window.location.href = '/login';

// Check token expiration
const token = localStorage.getItem('auth_token');
if (token) {
  const decoded = jwt_decode(token); // Use jwt-decode library
  console.log('Token expires:', new Date(decoded.exp * 1000));
}
```

#### 3. Role-Based Access Not Working

**Symptom**: Users can't access pages they should have permission for.

**Causes**:
- User role not set correctly in backend
- Frontend role check logic outdated
- Case sensitivity issues

**Solutions**:
```typescript
// Debug user role
const { user } = useAuth();
console.log('User role:', user?.role);
console.log('Required roles:', ['ADMIN', 'SUPER_ADMIN']);

// Check role comparison
console.log('Has access:',
  ['ADMIN', 'SUPER_ADMIN'].includes(user?.role as UserRole)
);
```

#### 4. File Upload Fails

**Symptom**: "Failed to upload file" error when uploading PDFs or images.

**Causes**:
- File size too large
- Wrong Content-Type header
- Backend storage not configured

**Solutions**:
```typescript
// Check file size before upload
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_FILE_SIZE) {
  notifyError('File Too Large', 'Maximum file size is 10MB');
  return;
}

// Ensure FormData is used correctly
const formData = new FormData();
formData.append('file', file);

// Let Axios set Content-Type automatically
const response = await apiClient.post(endpoint, formData);
```

#### 5. Search Results Empty

**Symptom**: AI search returns no results even for valid queries.

**Causes**:
- No products in database
- Vector embeddings not generated
- Similarity threshold too high

**Solutions**:
```typescript
// Check total products
const response = await apiClient.get('/api/v1/oracle/products');
console.log('Total products:', response.data.data.total);

// Try with lower similarity threshold
const params = new URLSearchParams({
  query: 'life insurance',
  similarity_threshold: '0.0' // Lower threshold
});
```

#### 6. Proposal Generation Stuck

**Symptom**: Proposal status stays in "extracting" or "generating" for too long.

**Causes**:
- Backend processing error
- LlamaParse service timeout
- OpenAI API rate limit

**Solutions**:
```typescript
// Check proposal status
const response = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}`);
console.log('Status:', response.data.data.proposal.status);
console.log('Error:', response.data.data.proposal.error_message);

// Check backend logs for errors
// Backend should have detailed error messages

// Retry generation if failed
if (status === 'failed') {
  await apiClient.post(`/api/v1/oracle/proposals/${proposalId}/retry`);
}
```

#### 7. Mobile Menu Not Closing

**Symptom**: Mobile hamburger menu stays open after navigation.

**Causes**:
- Missing `useEffect` cleanup
- Route change not detected

**Solutions**:
```typescript
// Add useEffect to close menu on route change
const pathname = usePathname();

useEffect(() => {
  setIsMobileMenuOpen(false);
}, [pathname]);
```

#### 8. Pagination Not Working

**Symptom**: Same data shown on all pages, or pagination buttons don't work.

**Causes**:
- Offset calculation incorrect
- `useEffect` dependencies missing
- Total pages not calculated correctly

**Solutions**:
```typescript
// Verify offset calculation
const offset = (currentPage - 1) * itemsPerPage;
console.log('Page:', currentPage, 'Offset:', offset);

// Ensure useEffect triggers on page change
useEffect(() => {
  fetchData();
}, [currentPage]); // Add currentPage as dependency

// Calculate total pages correctly
const totalPages = Math.ceil(totalItems / itemsPerPage);
```

### Performance Optimization

#### 1. Slow Initial Load

**Solutions**:
- Use Next.js Image component for optimized images
- Implement code splitting with dynamic imports
- Enable server-side rendering for critical pages

```typescript
// Dynamic import for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false // Client-side only if not SEO critical
});
```

#### 2. Slow API Requests

**Solutions**:
- Implement request caching
- Use pagination for large datasets
- Add loading states

```typescript
// Cache API responses
const cache = new Map();

const fetchWithCache = async (url: string) => {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await apiClient.get(url);
  cache.set(url, response.data);

  return response.data;
};
```

#### 3. Memory Leaks

**Solutions**:
- Clean up `useEffect` subscriptions
- Cancel pending requests on unmount

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    const data = await apiClient.get('/api/v1/oracle/data');
    if (isMounted) {
      setData(data);
    }
  };

  fetchData();

  return () => {
    isMounted = false; // Cleanup
  };
}, []);
```

### Debug Tools

**React DevTools**:
```bash
# Install React DevTools browser extension
# Chrome: https://chrome.google.com/webstore (search "React Developer Tools")
# Firefox: https://addons.mozilla.org/en-US/firefox/ (search "React Developer Tools")
```

**Network Debugging**:
```typescript
// Enable Axios request logging
apiClient.interceptors.request.use(request => {
  console.log('API Request:', request.method?.toUpperCase(), request.url);
  console.log('Headers:', request.headers);
  console.log('Data:', request.data);
  return request;
});

apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url);
    console.log('Data:', response.data);
    return response;
  },
  error => {
    console.error('API Error:', error.response?.status, error.config?.url);
    console.error('Error Data:', error.response?.data);
    return Promise.reject(error);
  }
);
```

---

## Additional Resources

### Documentation Links

- **Backend API Documentation**: [ORACLE.md](../wealth-manager-backend/ORACLE.md)
- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

### Support

For issues or questions:
1. Check this documentation first
2. Review backend API documentation
3. Check browser console for errors
4. Review Network tab in DevTools
5. Contact development team

---

**Last Updated**: January 2026
**Version**: 1.3.0
**Maintained By**: Wealth Manager AI Development Team
