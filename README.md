# Insurance Proposal Generator - Frontend

A modern Next.js 15 application for insurance agents to manage documents, compare products, and generate professional proposals.

## Features

### 🔐 Authentication & Authorization
- **Passwordless OTP Login** - Secure email-based authentication via Resend
- **Role-Based Access Control** - 6-tier system (SUPER_ADMIN, ADMIN, ADVISOR, LEADER_1, LEADER_2, SENIOR_PARTNER)
- **JWT Token Management** - Automatic refresh with 3-day session persistence
- **Protected Routes** - Role-aware navigation and access control

### 📄 Document Management
- **PDF Upload** - Drag-and-drop interface for insurance documents (up to 5 files, 15MB each)
- **Real-time Processing** - Live progress tracking through parsing, extraction, and vectorization
- **Document Search** - Semantic search through uploaded documents
- **AI-Powered Chat** - Query insurance documents with natural language

### 📊 Product Comparison
- **Side-by-Side Analysis** - Compare up to 5 insurance products
- **Commission Rates** - Role-based commission display with expandable terms
- **Financial Metrics** - Premium structures, returns, and yield data
- **PDF Export** - Dual-mode export (agent vs. client presentation)

### 📋 Proposal Generation
- **4-Page Professional Proposals** - AI-generated personalized content
- **Interactive Builder** - Edit all insurance fields with real-time sync
- **Cash Surrender Values** - Intelligent age harmonization across products
- **Currency Conversion** - Automatic MYR conversion with live exchange rates
- **PDF Generation** - High-quality landscape proposals via Playwright

### 🎨 Modern UI/UX
- **Responsive Design** - Mobile-first approach with glass-morphism effects
- **Collapsible Sidebar** - Persistent navigation state
- **Real-time Notifications** - Live updates with badge counters
- **Loading States** - Elegant skeleton screens and progress indicators
- **Toast Notifications** - User feedback for all actions

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **PDF Generation**: html2canvas + jsPDF
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: Supabase (client integration)

## Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see backend README)
- Supabase project configured

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/nugroho1234/wealth-manager-ai-frontend.git
cd wealth-manager-frontend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up environment variables

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Exchange Rate API (Optional)
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
```

See `.env.local.example` for detailed configuration.

### 4. Run development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm run start
```

## Production Deployment (Vercel)

### Step 1: Prepare Your Repository

1. Ensure all changes are committed to GitHub
2. Verify `.env.local` is in `.gitignore`
3. Confirm build succeeds locally: `npm run build`

### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `nugroho1234/wealth-manager-ai-frontend`
4. Vercel will auto-detect Next.js configuration

### Step 3: Configure Project Settings

**Framework Preset**: Next.js (auto-detected)

**Build Settings**:
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

**Root Directory**: `.` (leave empty)

**Node.js Version**: 18.x or higher

### Step 4: Configure Environment Variables

In Vercel's **Environment Variables** section, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.onrender.com
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=<your-exchange-rate-api-key>
```

**Important Notes**:
- Use your **production backend URL** (e.g., Render.com URL)
- Get Supabase keys from: Supabase Dashboard → Settings → API
- Exchange Rate API key is optional but recommended

### Step 5: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your application
3. Monitor build logs for any errors
4. Once deployed, you'll receive a URL like: `https://your-app.vercel.app`

### Step 6: Configure Backend CORS

Update your backend's `CORS_ORIGINS` environment variable:

```env
CORS_ORIGINS=["https://your-app.vercel.app"]
```

Redeploy your backend after updating CORS settings.

### Step 7: Optional - Custom Domain

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain (e.g., `app.yourdomain.com`)
4. Follow Vercel's DNS configuration instructions
5. Update backend `CORS_ORIGINS` with new domain

### Step 8: Configure Production Environment

**Vercel Environment Settings**:
- **Production**: Main branch (master/main)
- **Preview**: Pull request branches
- **Development**: Local development

**Recommended Settings**:
- Enable **Automatic Deployments** for main branch
- Enable **Preview Deployments** for PRs
- Configure **Branch Protection** on GitHub

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGc...` |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | Yes | `http://localhost:8000` (dev)<br>`https://api.example.com` (prod) |
| `NEXT_PUBLIC_EXCHANGE_RATE_API_KEY` | ExchangeRate-API key | No | Free tier available |

## Project Structure

```
wealth-manager-frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin pages (upload, commissions, users)
│   │   ├── chat/              # AI chat with documents
│   │   ├── dashboard/         # Role-based dashboard
│   │   ├── login/             # OTP authentication
│   │   ├── notifications/     # Notification center
│   │   ├── products/          # Product listing & comparison
│   │   ├── profile/           # User profile management
│   │   ├── proposals/         # Proposal generation & management
│   │   └── layout.tsx         # Root layout with sidebar
│   ├── components/            # Reusable React components
│   │   ├── auth/              # Authentication components
│   │   ├── chat/              # Chat UI components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── proposals/         # Proposal builder components
│   │   └── ui/                # Generic UI components
│   ├── contexts/              # React Context providers
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── services/              # API service layer
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Helper functions
├── public/                    # Static assets
├── .env.local.example         # Environment variables template
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Key Routes

### Public Routes
- `/login` - OTP authentication page

### Protected Routes (All Roles)
- `/dashboard` - Role-based dashboard
- `/profile` - User profile settings
- `/notifications` - Notification center
- `/chat` - AI document chat
- `/products` - Product listing
- `/products/compare` - Product comparison
- `/proposals` - Proposal management
- `/proposals/[id]` - Proposal builder
- `/proposals/[id]/preview` - Proposal preview

### Admin Routes (ADMIN, SUPER_ADMIN)
- `/admin/upload` - Insurance document upload
- `/admin/products` - Product management with pagination and filtering
- `/admin/commissions` - Commission rate management (SUPER_ADMIN only)
- `/admin/users` - User management with pagination and filtering

## Scripts

```bash
# Development
npm run dev          # Start development server (localhost:3000)

# Production Build
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Troubleshooting

### Build Failures on Vercel

**Issue**: TypeScript errors during build
```bash
# Solution: Run type-check locally first
npm run type-check
```

**Issue**: Missing environment variables
- Verify all `NEXT_PUBLIC_*` variables are set in Vercel
- Check for typos in variable names
- Ensure no trailing spaces in values

### Runtime Errors

**Issue**: API calls fail (CORS errors)
- Verify backend `CORS_ORIGINS` includes Vercel URL
- Ensure `NEXT_PUBLIC_API_BASE_URL` is correct
- Check backend is running and accessible

**Issue**: Authentication not working
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project is active
- Ensure backend OTP service is configured

**Issue**: PDFs not generating
- Check browser console for errors
- Verify `html2canvas` and `jsPDF` are installed
- Ensure sufficient browser memory

### Preview Deployments

**Issue**: Preview deployment environment variables
- Vercel automatically uses Production environment variables for previews
- Override with Preview-specific variables if needed
- Test preview deployments before merging to main

## Performance Optimization

### Vercel Edge Network
- Automatic global CDN distribution
- Edge caching for static assets
- Optimal routing for API requests

### Next.js Optimizations
- **Image Optimization**: Automatic via Next.js Image component
- **Code Splitting**: Route-based automatic splitting
- **Server Components**: Improved performance with React Server Components

### Recommended Settings
- Enable **Vercel Analytics** for performance monitoring
- Configure **Vercel Speed Insights** for real-user metrics
- Set up **Error Tracking** (Sentry integration recommended)

## Security Best Practices

- Never commit `.env.local` file
- Rotate Supabase keys if exposed
- Use environment variables for all sensitive data
- Enable Vercel's **Authentication Protection** for staging environments
- Review Vercel **Deployment Protection** settings
- Configure **Security Headers** in `next.config.js`

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a proprietary internal application. For questions or issues, contact the development team.

## License

Proprietary - Internal use only

## Version History

### Version 1.1.0 (December 2025)

**New Features:**

- **Products Pagination Interface** - Complete pagination UI for products listing at `/admin/products`
  - Pagination controls: First, Previous, Next, Last buttons
  - Page number display with current position
  - Configurable items per page (20, 50, 100)
  - Total count and range display (e.g., "Showing 1 to 20 of 150 products")
  - Pagination resets when applying filters
  - Smooth loading states during page transitions

- **Show Discontinued Products Filter** - Enhanced filtering UI
  - Clean checkbox design replacing awkward toggle switch
  - Better layout: 3-column filter grid with separate bottom row
  - Checkbox on left, "Clear All Filters" button on right
  - Border-top separator for visual hierarchy
  - Hover states and cursor feedback
  - Filters integrate seamlessly with pagination

- **User Management Interface** - New admin page at `/admin/users`
  - View all users with pagination (20 per page)
  - Filter users by role and company
  - Edit user profiles (first name, last name, phone)
  - Update user roles (SUPER_ADMIN only)
  - Real-time user statistics dashboard
  - Profile completion status indicators

- **Profile Auto-Completion** - Intelligent profile status updates
  - Automatically checks profile completion on login
  - Automatically updates status when editing profile
  - Real-time profile completion indicators
  - Required fields: first name, last name, phone

**Improvements:**
- **Enhanced Admin UI** - Consistent white background design across all admin pages
- **Better Data Display** - User avatars with fallback initials, role badges with color coding
- **Improved UX** - Modal-based editing with inline validation and error handling
- **Products Page Performance** - Optimized with pagination to handle large product catalogs
- **Better Filter Organization** - Cleaner filter layout with logical grouping

**Bug Fixes:**
- Fixed pagination field mapping to match backend API response
- Resolved user data fetching issues with proper role handling
- Fixed CORS and authentication token handling for user management endpoints
- Products page now displays accurate total counts and pagination states
- Profile completion status updates correctly after editing

### Version 1.0.0 (November 2025)
- Initial release with core features
- Passwordless OTP authentication with role-based access
- PDF document upload with real-time processing
- AI-powered chat for insurance document queries
- Product comparison tool (up to 5 products)
- Professional proposal generation with PDF export
- Responsive design with collapsible sidebar

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- Contact development team for internal support
