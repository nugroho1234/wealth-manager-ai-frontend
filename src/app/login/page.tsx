'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ApiError } from '@/types/auth';
import { formatErrorForDisplay } from '@/lib/utils';

// Validation schemas
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpSchema = z.object({
  otpCode: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const { isAuthenticated, requestOTP, verifyOTP, checkEmailAllowed } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // OTP form
  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otpCode: '' },
  });

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if email is allowed
      const isAllowed = await checkEmailAllowed(data.email);
      if (!isAllowed) {
        setError('This email is not authorized to access the system. Please contact your administrator.');
        return;
      }

      // Request OTP
      const response = await requestOTP(data.email);
      setEmail(data.email);
      setStep('otp');
      
      // Set countdown timer
      if (response.expires_in) {
        setCountdown(response.expires_in);
        setOtpExpiry(Date.now() + response.expires_in * 1000);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await verifyOTP(email, data.otpCode);
      // AuthContext will handle the redirect to dashboard
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.detail || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestOTP(email);
      if (response.expires_in) {
        setCountdown(response.expires_in);
        setOtpExpiry(Date.now() + response.expires_in * 1000);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.detail || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
    setError(null);
    setCountdown(0);
    setOtpExpiry(null);
    otpForm.reset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {process.env.NEXT_PUBLIC_APP_NAME || 'Virtual Wealth Manager'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'email' ? 'Sign in to your account' : 'Enter the verification code'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {formatErrorForDisplay(error)}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...emailForm.register('email')}
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field"
                    placeholder="Enter your email address"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formatErrorForDisplay(emailForm.formState.errors.email.message)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Send Verification Code'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit verification code to
                </p>
                <p className="font-medium text-gray-900">{email}</p>
                {countdown > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Code expires in {formatTime(countdown)}
                  </p>
                )}
              </div>

              <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div className="mt-1">
                    <input
                      {...otpForm.register('otpCode')}
                      type="text"
                      maxLength={6}
                      className="input-field text-center tracking-widest text-lg"
                      placeholder="000000"
                      autoComplete="one-time-code"
                    />
                    {otpForm.formState.errors.otpCode && (
                      <p className="mt-1 text-sm text-red-600">
                        {formatErrorForDisplay(otpForm.formState.errors.otpCode.message)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Sign In'}
                  </button>
                </div>
              </form>

              <div className="text-center space-y-2">
                <button
                  onClick={handleResendOTP}
                  disabled={isLoading || countdown > 0}
                  className="text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend in ${formatTime(countdown)}` : 'Resend Code'}
                </button>
                <div>
                  <button
                    onClick={handleBackToEmail}
                    className="text-sm text-gray-600 hover:text-gray-500"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}