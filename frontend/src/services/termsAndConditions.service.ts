import apiService from './api.service';
import { ApiResponse } from '@/types';

export interface TermsAndConditionsData {
  contentEn: string;
  contentAr: string;
  updatedAt?: string;
}

class TermsAndConditionsService {
  /**
   * Get public terms and conditions
   */
  async getPublicTermsAndConditions() {
    return apiService.get<ApiResponse<TermsAndConditionsData>>('/terms-and-conditions');
  }
}

export default new TermsAndConditionsService();