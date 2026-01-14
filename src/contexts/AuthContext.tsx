'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  AuthState, 
  User, 
  AuthTokens, 
  OTPRequest, 
  OTPVerification, 
  OTPResponse, 
  ProfileUpdateData 
} from '@/types/auth';
import { authService } from '@/services/auth';
import { setAuthTokens, getAuthTokens, clearAuthTokens } from '@/lib/api';

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TOKENS'; payload: AuthTokens | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
      };
    case 'SET_TOKENS':
      return {
        ...state,
        tokens: action.payload,
        isAuthenticated: action.payload !== null && state.user !== null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Helper function to get redirect path based on plan type
function getRedirectPath(user: User | null): string {
  if (!user) return '/login';

  // If user has no plan_type or it's null, default to meeting_tracker
  // This ensures new users start with the meeting tracker
  const planType = user.plan_type || 'meeting_tracker';

  switch (planType) {
    case 'meeting_tracker':
      return '/meeting-tracker/dashboard';
    case 'oracle':
      return '/oracle/dashboard';
    default:
      return '/meeting-tracker/dashboard';
  }
}

// Context interface
interface AuthContextType extends AuthState {
  requestOTP: (email: string) => Promise<OTPResponse>;
  verifyOTP: (email: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  checkEmailAllowed: (email: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  getRedirectPath: () => string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const tokens = getAuthTokens();
        if (tokens) {
          dispatch({ type: 'SET_TOKENS', payload: tokens });
          
          // Validate token and get user
          const isValid = await authService.validateToken();
          if (isValid) {
            const user = await authService.getCurrentUser();
            dispatch({ type: 'SET_USER', payload: user });
          } else {
            // Token is invalid, clear it
            clearAuthTokens();
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        clearAuthTokens();
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Add token expiration monitoring
  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) return;

    const checkTokenExpiration = () => {
      const tokens = getAuthTokens();
      if (!tokens) {
        // Token was cleared, logout user
        dispatch({ type: 'LOGOUT' });
      }
    };

    // Check token every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.tokens]);

  const requestOTP = async (email: string): Promise<OTPResponse> => {
    const otpRequest: OTPRequest = { email };
    return await authService.requestOTP(otpRequest);
  };

  const verifyOTP = async (email: string, otpCode: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const otpVerification: OTPVerification = { email, otp_code: otpCode };
      const authResponse = await authService.verifyOTP(otpVerification);
      
      // Set tokens in API client
      setAuthTokens({
        access_token: authResponse.access_token,
        token_type: authResponse.token_type,
        expires_in: authResponse.expires_in,
      });
      
      // Update state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: authResponse.user,
          tokens: {
            access_token: authResponse.access_token,
            token_type: authResponse.token_type,
            expires_in: authResponse.expires_in,
          },
        },
      });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthTokens();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateProfile = async (data: ProfileUpdateData): Promise<void> => {
    const updatedUser = await authService.updateProfile(data);
    dispatch({ type: 'UPDATE_PROFILE', payload: updatedUser });
  };

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    return await authService.checkEmailAllowed(email);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  const getUserRedirectPath = (): string => {
    return getRedirectPath(state.user);
  };

  const contextValue: AuthContextType = {
    ...state,
    requestOTP,
    verifyOTP,
    logout,
    updateProfile,
    checkEmailAllowed,
    refreshUser,
    getRedirectPath: getUserRedirectPath,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;