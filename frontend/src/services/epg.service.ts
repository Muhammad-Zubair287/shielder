import apiClient from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';

export type MockEpgScenario =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'timeout'
  | 'duplicate_callback'
  | 'refund_success'
  | 'refund_failure'
  | 'already_refunded';

class EpgService {
  async getMockSession(sessionId: string) {
    const res = await apiClient.get(API_ENDPOINTS.EPG.MOCK_SESSION(sessionId));
    return res.data;
  }

  async triggerMockScenario(sessionId: string, scenario: MockEpgScenario) {
    const res = await apiClient.post(API_ENDPOINTS.EPG.MOCK_TRIGGER, { sessionId, scenario });
    return res.data;
  }

  async getProviderInfo() {
    const res = await apiClient.get(API_ENDPOINTS.EPG.PROVIDER);
    return res.data;
  }
}

export const epgService = new EpgService();
