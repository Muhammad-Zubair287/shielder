import apiClient from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';

export type ApplicationPlatform = 'ANDROID' | 'IOS';
export type ApplicationStatus = 'ACTIVE' | 'INACTIVE';

export type Application = {
  id: number;
  applicationName: string;
  platform: ApplicationPlatform;
  description: string | null;
  image: string | null;
  downloadUrl: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationPayload = {
  applicationName: string;
  platform: ApplicationPlatform;
  downloadUrl: string;
  description?: string;
  status?: ApplicationStatus;
  image?: File | null;
};

class ApplicationService {
  async list() {
    const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS.BASE);
    return res.data;
  }

  async listActive() {
    const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS.ACTIVE);
    return res.data;
  }

  async getById(id: number) {
    const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS.BY_ID(id));
    return res.data;
  }

  async create(payload: ApplicationPayload) {
    const formData = new FormData();
    formData.append('applicationName', payload.applicationName);
    formData.append('platform', payload.platform);
    formData.append('downloadUrl', payload.downloadUrl);
    if (payload.description) formData.append('description', payload.description);
    if (payload.status) formData.append('status', payload.status);
    if (payload.image) formData.append('appImage', payload.image);

    const res = await apiClient.post(API_ENDPOINTS.APPLICATIONS.BASE, formData);
    return res.data;
  }

  async update(id: number, payload: Partial<ApplicationPayload>) {
    const formData = new FormData();
    if (payload.applicationName !== undefined) formData.append('applicationName', payload.applicationName);
    if (payload.platform !== undefined) formData.append('platform', payload.platform);
    if (payload.downloadUrl !== undefined) formData.append('downloadUrl', payload.downloadUrl);
    if (payload.description !== undefined) formData.append('description', payload.description);
    if (payload.status !== undefined) formData.append('status', payload.status);
    if (payload.image) formData.append('appImage', payload.image);

    const res = await apiClient.put(API_ENDPOINTS.APPLICATIONS.BY_ID(id), formData);
    return res.data;
  }

  async remove(id: number) {
    const res = await apiClient.delete(API_ENDPOINTS.APPLICATIONS.BY_ID(id));
    return res.data;
  }

  async updateStatus(id: number, status: ApplicationStatus) {
    const res = await apiClient.patch(API_ENDPOINTS.APPLICATIONS.STATUS(id), { status });
    return res.data;
  }
}

export const applicationService = new ApplicationService();
