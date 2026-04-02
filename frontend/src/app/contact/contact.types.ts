export interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  captchaConfirmed: boolean;
}

export interface ContactSubmissionPayload {
  values: ContactFormValues;
  attachment?: File | null;
  captchaToken?: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  message: string;
}

export interface ContactValidationError {
  field: keyof ContactFormValues | 'attachment';
  message: string;
}
