import api from './api.service';

export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: boolean;
}

const profileService = {
  getProfile: () => {
    return api.get('profile');
  },

  updateProfile: (data: any) => {
    return api.put('profile', data);
  },

  updatePreferences: (preferences: UserPreferences) => {
    return api.patch('profile/preferences', preferences);
  },

  uploadProfileImage: async (file: File) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const response = await api.post('profile/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
};

export default profileService;
