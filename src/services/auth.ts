import apiClient from '@/lib/api';
import {
  OTPRequest,
  OTPVerification,
  OTPResponse,
  AuthResponse,
  User,
  ProfileUpdateData,
} from '@/types/auth';

class AuthService {
  private readonly baseUrl = '/api/v1/auth';

  /**
   * Request OTP for email
   */
  async requestOTP(data: OTPRequest): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>(`${this.baseUrl}/request-otp`, data);
    return response.data;
  }

  /**
   * Verify OTP and get authentication tokens
   */
  async verifyOTP(data: OTPVerification): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(`${this.baseUrl}/verify-otp`, data);
    return response.data;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(`${this.baseUrl}/me`);
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await apiClient.put<User>(`${this.baseUrl}/me`, data);
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post(`${this.baseUrl}/logout`);
  }

  /**
   * Check if email is allowed
   */
  async checkEmailAllowed(email: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/check-email/${encodeURIComponent(email)}`);
      return response.status === 200;
    } catch (error: any) {
      if (error.status_code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Validate token and refresh if needed
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;