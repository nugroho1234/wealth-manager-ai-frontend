'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireProfileCompletion?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireProfileCompletion = false,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        router.replace(redirectTo);
        return;
      }

      // Authenticated but no user data
      if (!user) {
        router.replace(redirectTo);
        return;
      }

      // Check role permissions
      if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.includes(user.role as UserRole);
        if (!hasPermission) {
          router.replace('/unauthorized');
          return;
        }
      }

      // Check profile completion requirement
      if (requireProfileCompletion && !user.is_profile_complete) {
        router.replace('/profile/complete');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, requireProfileCompletion, router, redirectTo]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check role permissions
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = allowedRoles.includes(user.role as UserRole);
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-sm text-gray-500 mb-4">
              You don't have permission to access this page. Contact your administrator if you believe this is an error.
            </p>
            <button
              onClick={() => router.replace('/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // Check profile completion requirement
  if (requireProfileCompletion && !user.is_profile_complete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Higher-order component for role-based access
export function withRoleAccess(allowedRoles: UserRole[], requireProfileCompletion = false) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      return (
        <ProtectedRoute 
          allowedRoles={allowedRoles} 
          requireProfileCompletion={requireProfileCompletion}
        >
          <Component {...props} />
        </ProtectedRoute>
      );
    };
  };
}

// Utility function to check if user has specific role
export function hasRole(userRole: string, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole as UserRole);
}

// Utility function to check if user has minimum hierarchy level
export function hasMinimumHierarchy(userHierarchy: number, minimumLevel: number): boolean {
  return userHierarchy >= minimumLevel;
}