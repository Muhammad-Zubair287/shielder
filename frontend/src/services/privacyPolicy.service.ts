/**
 * Privacy Policy Service
 */

import apiService from './api.service';
import { ApiResponse } from '@/types';

export interface PrivacyPolicyData {
  contentEn: string;
  contentAr: string;
  updatedAt?: string;
}

class PrivacyPolicyService {
  /**
   * Get public privacy policy
   */
  async getPublicPolicy() {
    return apiService.get<ApiResponse<PrivacyPolicyData>>('/privacy-policy');
  }

  /**
   * Update privacy policy (Super Admin)
   */
  async updatePolicy(data: PrivacyPolicyData) {
    return apiService.put<ApiResponse<PrivacyPolicyData>>('/privacy-policy/admin', data);
  }
}

export default new PrivacyPolicyService();
