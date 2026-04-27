/**
 * Translation utilities for Arabic/English support
 * @deprecated Use @/i18n/config for new code. This file is kept for backward compatibility.
 */

import type { Locale } from '@/i18n/config';
export type { Locale };

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

    // ─── Admin Panel ────────────────────────────────────────────────────────────

    // Language Switcher
    switchLanguage: 'Language',
    english: 'English',
    arabic: 'العربية',
    languageChanged: 'Language changed',

    // Sidebar navigation
    dashboard: 'Dashboard',
    categories: 'Categories',
    subcategories: 'Sub Categories',
    products: 'Products',
    orders: 'Orders',
    users: 'Users',
    quotations: 'Quotations',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
    inventory: 'Inventory',
    analytics: 'Analytics',
    suppliers: 'Suppliers',
    brands: 'Brands',

    // Common Actions
    addNew: 'Add New',
    search: 'Search...',
    filter: 'Filter',
    refresh: 'Refresh',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    create: 'Create',
    update: 'Update',
    confirm: 'Confirm',
    reset: 'Reset',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    yes: 'Yes',
    no: 'No',

    // Status Labels
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived',
    enabled: 'Enabled',
    disabled: 'Disabled',
    all: 'All',

    // Form Labels — Bilingual
    nameEn: 'Name (English)',
    nameAr: 'Name (Arabic)',
    descriptionEn: 'Description (English)',
    descriptionAr: 'Description (Arabic)',
    titleEn: 'Title (English)',
    titleAr: 'Title (Arabic)',

    // Form Labels — Common
    image: 'Image',
    uploadImage: 'Upload Image',
    changeImage: 'Change Image',
    removeImage: 'Remove Image',
    selectCategory: 'Select Category',
    selectSubcategory: 'Select Sub Category',
    selectStatus: 'Select Status',
    price: 'Price',
    stock: 'Stock',
    sku: 'SKU',
    minimumStock: 'Minimum Stock Threshold',

    // Table Headers
    id: 'ID',
    status: 'Status',
    actions: 'Actions',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    total: 'Total',
    quantity: 'Qty',

    // Categories Page
    categoriesTitle: 'Categories',
    categoriesSubtitle: 'Manage product categories',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    categoryName: 'Category Name',
    categoryDescription: 'Description',
    categoryImage: 'Category Image',
    noCategories: 'No categories found',
    totalCategories: 'Total Categories',
    activeCategories: 'Active',
    disabledCategories: 'Disabled',
    deleteConfirm: 'Are you sure you want to delete this item?',
    deleteCannotUndo: 'This action cannot be undone.',

    // Subcategories Page
    subcategoriesTitle: 'Sub Categories',
    subcategoriesSubtitle: 'Manage product sub categories',
    addSubcategory: 'Add Sub Category',
    editSubcategory: 'Edit Sub Category',
    deleteSubcategory: 'Delete Sub Category',
    parentCategory: 'Parent Category',
    noSubcategories: 'No sub categories found',
    totalSubcategories: 'Total Sub Categories',

    // Products Page
    productsTitle: 'Products',
    productsSubtitle: 'Manage product catalogue',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    deleteProduct: 'Delete Product',
    productName: 'Product Name',
    productDescription: 'Description',
    productImages: 'Product Images',
    noProducts: 'No products found',
    totalProducts: 'Total Products',
    lowStock: 'Low Stock',
    pendingApproval: 'Pending Approval',

    // Orders Page
    ordersTitle: 'Orders',
    ordersSubtitle: 'Track and manage customer orders',
    orderNumber: 'Order #',
    customer: 'Customer',
    orderDate: 'Order Date',
    orderStatus: 'Status',
    orderTotal: 'Total',
    noOrders: 'No orders found',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',

    // Quotations Page
    quotationsTitle: 'Quotations',
    quotationsSubtitle: 'Manage customer price requests',
    quotationNumber: 'Quotation #',
    requestedBy: 'Requested By',
    quotationDate: 'Date',
    quotationStatus: 'Status',
    noQuotations: 'No quotations found',
    pendingQuotations: 'Pending',
    respondedQuotations: 'Responded',

    // Reports Page
    reportsTitle: 'Reports',
    reportsSubtitle: 'Sales and analytics reports',
    salesReport: 'Sales Report',
    inventoryReport: 'Inventory Report',
    ordersReport: 'Orders Report',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
    generateReport: 'Generate Report',

    // Notifications Page
    notificationsTitle: 'Notifications',
    notificationsSubtitle: 'System and user notifications',
    markAllRead: 'Mark All as Read',
    noNotifications: 'No notifications',
    newNotification: 'New Notification',

    // Settings Page
    settingsTitle: 'Settings',
    settingsSubtitle: 'System configuration',
    generalSettings: 'General Settings',
    securitySettings: 'Security Settings',
    notificationSettings: 'Notification Settings',
    systemSettings: 'System Settings',
    saveSettings: 'Save Settings',

    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Overview of your business',
    totalOrders: 'Total Orders',
    totalRevenue: 'Total Revenue',
    totalUsers: 'Total Users',
    recentOrders: 'Recent Orders',
    topProducts: 'Top Products',
    salesOverview: 'Sales Overview',
    quickStats: 'Quick Stats',

    // Pagination
    showing: 'Showing',
    of: 'of',
    results: 'results',
    page: 'Page',
    rowsPerPage: 'Rows per page',

    // Sidebar — Quotations submenu
    allQuotations: 'All Quotations',
    createQuotation: 'Create Quotation',
    draftQuotations: 'Draft Quotations',
    expired: 'Expired',
    quotationReports: 'Reports',

    // Navbar
    searchPlaceholder: 'Search orders, products, users...',
    quickActions: 'Quick Actions',
    newOrder: 'New Order',
    newQuotation: 'New Quotation',
    adminPanel: 'Admin Panel',
    overviewAnalytics: 'Overview & Analytics',
    manageCategories: 'Manage product categories',
    manageSubcategories: 'Manage subcategories',
    productInventory: 'Product inventory management',
    manageOrders: 'Manage customer orders',
    customerAccounts: 'Customer accounts',
    manageQuotations: 'Manage quotations',
    newQuotationSubtitle: 'Create a new quotation',
    analyticsInsights: 'Analytics & insights',
    systemAlerts: 'System alerts & updates',
    profilePassword: 'Profile & password',
    searching: 'Searching...',
    noResultsFound: 'No results found',
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

    // ─── لوحة الإدارة ────────────────────────────────────────────────────────────

    // Language Switcher
    switchLanguage: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    languageChanged: 'تم تغيير اللغة',

    // التنقل في الشريط الجانبي
    dashboard: 'لوحة التحكم',
    categories: 'الفئات',
    subcategories: 'الفئات الفرعية',
    products: 'المنتجات',
    orders: 'الطلبات',
    users: 'المستخدمون',
    quotations: 'عروض الأسعار',
    reports: 'التقارير',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    inventory: 'المخزون',
    analytics: 'التحليلات',
    suppliers: 'الموردون',
    brands: 'العلامات التجارية',

    // الإجراءات الشائعة
    addNew: 'إضافة جديد',
    search: 'بحث...',
    filter: 'تصفية',
    refresh: 'تحديث',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    create: 'إنشاء',
    update: 'تحديث',
    confirm: 'تأكيد',
    reset: 'إعادة تعيين',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    close: 'إغلاق',
    yes: 'نعم',
    no: 'لا',

    // تسميات الحالة
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    published: 'منشور',
    draft: 'مسودة',
    archived: 'مؤرشف',
    enabled: 'مفعّل',
    disabled: 'معطّل',
    all: 'الكل',

    // تسميات النموذج — ثنائية اللغة
    nameEn: 'الاسم (إنجليزي)',
    nameAr: 'الاسم (عربي)',
    descriptionEn: 'الوصف (إنجليزي)',
    descriptionAr: 'الوصف (عربي)',
    titleEn: 'العنوان (إنجليزي)',
    titleAr: 'العنوان (عربي)',

    // تسميات النموذج — عامة
    image: 'الصورة',
    uploadImage: 'رفع صورة',
    changeImage: 'تغيير الصورة',
    removeImage: 'إزالة الصورة',
    selectCategory: 'اختر الفئة',
    selectSubcategory: 'اختر الفئة الفرعية',
    selectStatus: 'اختر الحالة',
    price: 'السعر',
    stock: 'المخزون',
    sku: 'رمز المنتج',
    minimumStock: 'الحد الأدنى للمخزون',

    // رؤوس الجدول
    id: 'المعرف',
    status: 'الحالة',
    actions: 'الإجراءات',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'تاريخ التحديث',
    total: 'الإجمالي',
    quantity: 'الكمية',

    // صفحة الفئات
    categoriesTitle: 'الفئات',
    categoriesSubtitle: 'إدارة فئات المنتجات',
    addCategory: 'إضافة فئة',
    editCategory: 'تعديل الفئة',
    deleteCategory: 'حذف الفئة',
    categoryName: 'اسم الفئة',
    categoryDescription: 'الوصف',
    categoryImage: 'صورة الفئة',
    noCategories: 'لا توجد فئات',
    totalCategories: 'إجمالي الفئات',
    activeCategories: 'نشطة',
    disabledCategories: 'معطّلة',
    deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذا العنصر؟',
    deleteCannotUndo: 'لا يمكن التراجع عن هذا الإجراء.',

    // صفحة الفئات الفرعية
    subcategoriesTitle: 'الفئات الفرعية',
    subcategoriesSubtitle: 'إدارة الفئات الفرعية للمنتجات',
    addSubcategory: 'إضافة فئة فرعية',
    editSubcategory: 'تعديل الفئة الفرعية',
    deleteSubcategory: 'حذف الفئة الفرعية',
    parentCategory: 'الفئة الرئيسية',
    noSubcategories: 'لا توجد فئات فرعية',
    totalSubcategories: 'إجمالي الفئات الفرعية',

    // صفحة المنتجات
    productsTitle: 'المنتجات',
    productsSubtitle: 'إدارة كتالوج المنتجات',
    addProduct: 'إضافة منتج',
    editProduct: 'تعديل المنتج',
    deleteProduct: 'حذف المنتج',
    productName: 'اسم المنتج',
    productDescription: 'الوصف',
    productImages: 'صور المنتج',
    noProducts: 'لا توجد منتجات',
    totalProducts: 'إجمالي المنتجات',
    lowStock: 'مخزون منخفض',
    pendingApproval: 'بانتظار الموافقة',

    // صفحة الطلبات
    ordersTitle: 'الطلبات',
    ordersSubtitle: 'تتبع وإدارة طلبات العملاء',
    orderNumber: 'رقم الطلب',
    customer: 'العميل',
    orderDate: 'تاريخ الطلب',
    orderStatus: 'الحالة',
    orderTotal: 'الإجمالي',
    noOrders: 'لا توجد طلبات',
    processing: 'قيد المعالجة',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',

    // صفحة عروض الأسعار
    quotationsTitle: 'عروض الأسعار',
    quotationsSubtitle: 'إدارة طلبات الأسعار من العملاء',
    quotationNumber: 'رقم عرض السعر',
    requestedBy: 'طلب بواسطة',
    quotationDate: 'التاريخ',
    quotationStatus: 'الحالة',
    noQuotations: 'لا توجد عروض أسعار',
    pendingQuotations: 'قيد الانتظار',
    respondedQuotations: 'تمت الاستجابة',

    // صفحة التقارير
    reportsTitle: 'التقارير',
    reportsSubtitle: 'تقارير المبيعات والتحليلات',
    salesReport: 'تقرير المبيعات',
    inventoryReport: 'تقرير المخزون',
    ordersReport: 'تقرير الطلبات',
    dateRange: 'نطاق التاريخ',
    from: 'من',
    to: 'إلى',
    generateReport: 'إنشاء التقرير',

    // صفحة الإشعارات
    notificationsTitle: 'الإشعارات',
    notificationsSubtitle: 'إشعارات النظام والمستخدم',
    markAllRead: 'تعليم الكل كمقروء',
    noNotifications: 'لا توجد إشعارات',
    newNotification: 'إشعار جديد',

    // صفحة الإعدادات
    settingsTitle: 'الإعدادات',
    settingsSubtitle: 'تكوين النظام',
    generalSettings: 'الإعدادات العامة',
    securitySettings: 'إعدادات الأمان',
    notificationSettings: 'إعدادات الإشعارات',
    systemSettings: 'إعدادات النظام',
    saveSettings: 'حفظ الإعدادات',

    // لوحة التحكم
    dashboardTitle: 'لوحة التحكم',
    dashboardSubtitle: 'نظرة عامة على أعمالك',
    totalOrders: 'إجمالي الطلبات',
    totalRevenue: 'إجمالي الإيرادات',
    totalUsers: 'إجمالي المستخدمين',
    recentOrders: 'الطلبات الأخيرة',
    topProducts: 'أفضل المنتجات',
    salesOverview: 'نظرة عامة على المبيعات',
    quickStats: 'إحصائيات سريعة',

    // الترقيم
    showing: 'عرض',
    of: 'من',
    results: 'نتائج',
    page: 'الصفحة',
    rowsPerPage: 'صفوف في الصفحة',

    // الشريط الجانبي — قائمة عروض الأسعار الفرعية
    allQuotations: 'جميع عروض الأسعار',
    createQuotation: 'إنشاء عرض سعر',
    draftQuotations: 'مسودات عروض الأسعار',
    expired: 'منتهية الصلاحية',
    quotationReports: 'التقارير',

    // شريط التنقل العلوي
    searchPlaceholder: 'البحث عن طلبات، منتجات، مستخدمين...',
    quickActions: 'إجراءات سريعة',
    newOrder: 'طلب جديد',
    newQuotation: 'عرض سعر جديد',
    adminPanel: 'لوحة الإدارة',
    overviewAnalytics: 'نظرة عامة وتحليلات',
    manageCategories: 'إدارة فئات المنتجات',
    manageSubcategories: 'إدارة الفئات الفرعية',
    productInventory: 'إدارة مخزون المنتجات',
    manageOrders: 'إدارة طلبات العملاء',
    customerAccounts: 'حسابات العملاء',
    manageQuotations: 'إدارة عروض الأسعار',
    newQuotationSubtitle: 'إنشاء عرض سعر جديد',
    analyticsInsights: 'التحليلات والرؤى',
    systemAlerts: 'تنبيهات النظام والتحديثات',
    profilePassword: 'الملف الشخصي وكلمة المرور',
    searching: 'جاري البحث...',
    noResultsFound: 'لا توجد نتائج',
  },
};

export const getTranslation = (locale: Locale = 'en') => {
  return translations[locale];
};

export const isRTL = (locale: Locale) => {
  return locale === 'ar';
};
