import apiClient, { handleApiError } from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';
import { ContactSubmissionPayload, ContactSubmissionResult } from '@/app/contact/contact.types';

class ContactService {
  async submit(payload: ContactSubmissionPayload): Promise<ContactSubmissionResult> {
    try {
      const formData = new FormData();
      formData.append('firstName', payload.values.firstName.trim());
      formData.append('lastName', payload.values.lastName.trim());
      formData.append('email', payload.values.email.trim());
      formData.append('phone', payload.values.phone.trim());
      formData.append('subject', payload.values.subject);
      formData.append('message', payload.values.message.trim());
      formData.append('captchaToken', payload.captchaToken || '');

      if (payload.attachment) {
        formData.append('attachment', payload.attachment);
      }

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.CONTACT.SUBMIT,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return {
        success: response.data.success,
        message: response.data.message || 'Message sent successfully',
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

const contactService = new ContactService();

export default contactService;
