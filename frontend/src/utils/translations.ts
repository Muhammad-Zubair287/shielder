/**
 * Translation utilities for Arabic/English support
 */

export type Locale = 'en' | 'ar';

export const translations = {
  en: {
    // Common
    welcome: 'Welcome',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Full Name',
    company: 'Company Name',
    phone: 'Phone Number',
    address: 'Address',
    language: 'Language',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Auth Pages
    signIn: 'Sign In',
    signUp: 'Sign Up',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginYourAccount: 'Login your account!',
    welcomeToShielder: 'Welcome to the Shielder',
    loginToExplore: 'Login to explore',
    continue: 'Continue',
    
    // Form Labels
    enterEmail: 'Enter your email',
    enterPassword: 'Enter your password',
    enterName: 'Enter your full name',
    enterCompany: 'Enter company name',
    enterPhone: 'Enter phone number',
    enterAddress: 'Enter your address',
    selectLanguage: 'Select Language',
    
    // Validation
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    passwordMismatch: 'Passwords do not match',
    invalidEmail: 'Invalid email format',
    passwordMinLength: 'Password must be at least 8 characters',
    nameRequired: 'Name is required',
    addressRequired: 'Address is required',
    
    // Messages
    loginSuccess: 'Login successful',
    loginError: 'Login failed. Please check your credentials',
    registerSuccess: 'Registration successful',
    registerError: 'Registration failed',
    
    // Homepage
    heroTitle: 'Shielder Digital Platform',
    heroSubtitle: 'Enterprise digital backbone for industrial filters',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    features: 'Features',
    
    // Features
    featureAuth: 'Secure Authentication',
    featureAuthDesc: 'Enterprise-grade security with JWT tokens',
    featureMultilang: 'Multilingual Support',
    featureMultilangDesc: 'Full support for English and Arabic',
    featureRoles: 'Role-based Access',
    featureRolesDesc: 'Admin, Supplier, and Customer roles',
    
    // Footer
    allRightsReserved: 'All rights reserved',
    
    // Register Form
    termsAndConditions: 'I accept the terms and conditions',
    termsRequired: 'You must accept the terms and conditions',
    
    // Login Form
    welcomeBack: 'Welcome back',
    loginDescription: 'Enter your credentials to access your account',
    
    // Register Description
    createAccountDesc: 'Fill in your details to create an account',
  },
  ar: {
    // Common - الشائع
    welcome: 'مرحباً',
    login: 'تسجيل الدخول',
    register: 'التسجيل',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    name: 'الاسم الكامل',
    company: 'اسم الشركة',
    phone: 'رقم الهاتف',
    address: 'العنوان',
    language: 'اللغة',
    submit: 'إرسال',
    cancel: 'إلغاء',
    save: 'حفظ',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    
    // Auth Pages - صفحات المصادقة
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    createAccount: 'إنشاء حساب',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    rememberMe: 'تذكرني',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    loginYourAccount: 'تسجيل الدخول إلى حسابك!',
    welcomeToShielder: 'مرحباً بكم في شيلدر',
    loginToExplore: 'سجل الدخول للاستكشاف',
    continue: 'متابعة',
    
    // Form Labels - تسميات النموذج
    enterEmail: 'أدخل بريدك الإلكتروني',
    enterPassword: 'أدخل كلمة المرور',
    enterName: 'أدخل اسمك الكامل',
    enterCompany: 'أدخل اسم الشركة',
    enterPhone: 'أدخل رقم الهاتف',
    enterAddress: 'أدخل العنوان',
    selectLanguage: 'اختر اللغة',
    
    // Validation - التحقق
    emailRequired: 'البريد الإلكتروني مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    invalidEmail: 'صيغة البريد الإلكتروني غير صحيحة',
    passwordMinLength: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    nameRequired: 'الاسم مطلوب',
    addressRequired: 'العنوان مطلوب',
    
    // Messages - الرسائل
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    loginError: 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد',
    registerSuccess: 'تم التسجيل بنجاح',
    registerError: 'فشل التسجيل',
    
    // Homepage - الصفحة الرئيسية
    heroTitle: 'منصة شيلدر الرقمية',
    heroSubtitle: 'العمود الفقري الرقمي للمؤسسات للفلاتر الصناعية',
    getStarted: 'ابدأ الآن',
    learnMore: 'اعرف المزيد',
    features: 'المميزات',
    
    // Features - المميزات
    featureAuth: 'مصادقة آمنة',
    featureAuthDesc: 'أمان على مستوى المؤسسات مع رموز JWT',
    featureMultilang: 'دعم متعدد اللغات',
    featureMultilangDesc: 'دعم كامل للغة الإنجليزية والعربية',
    featureRoles: 'الوصول على أساس الدور',
    featureRolesDesc: 'أدوار المسؤول والمورد والعميل',
    
    // Footer - التذييل
    allRightsReserved: 'جميع الحقوق محفوظة',
    
    // Register Form - نموذج التسجيل
    termsAndConditions: 'أوافق على الشروط والأحكام',
    termsRequired: 'يجب عليك قبول الشروط والأحكام',
    
    // Login Form - نموذج تسجيل الدخول
    welcomeBack: 'مرحباً بعودتك',
    loginDescription: 'أدخل بيانات الاعتماد للوصول إلى حسابك',
    
    // Register Description
    createAccountDesc: 'املأ التفاصيل الخاصة بك لإنشاء حساب',
  },
};

export const getTranslation = (locale: Locale = 'en') => {
  return translations[locale];
};

export const isRTL = (locale: Locale) => {
  return locale === 'ar';
};
