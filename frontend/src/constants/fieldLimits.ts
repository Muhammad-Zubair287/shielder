/**
 * Centralized character limits for all form fields.
 * These MUST match the Joi .max() values in backend validation schemas.
 */
export const FIELD_LIMITS = {
  // ── Auth / Registration ─────────────────────────────────────────────────────
  fullName: 50,
  email: 254,
  phoneNumber: 20,
  address: 150,       // registration address
  location: 150,      // registration location
  companyName: 50,    // registration company name
  password: 32,

  // ── Profile ─────────────────────────────────────────────────────────────────
  profile: {
    fullName: 100,
    phone: 20,
    location: 255,
    address: 255,
    companyName: 100,
    taxId: 50,
  },

  // ── Inventory: Categories & Subcategories ────────────────────────────────────
  category: {
    nameEn: 100,
    nameAr: 100,
    descriptionEn: 1000,
    descriptionAr: 1000,
  },

  subcategory: {
    nameEn: 100,
    nameAr: 100,
    descriptionEn: 1000,
    descriptionAr: 1000,
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  product: {
    nameEn: 200,
    nameAr: 200,
    descriptionEn: 5000,
    descriptionAr: 5000,
    sku: 50,
    filterNumber: 100,
    alternateNumbers: 500,
    filterType: 100,
    material: 200,
    dimensions: 200,
  },

  // ── Warehouse ────────────────────────────────────────────────────────────────
  warehouse: {
    name: 200,
    address: 500,
    city: 100,
    country: 100,
  },

  // ── Orders / Checkout ────────────────────────────────────────────────────────
  order: {
    customerName: 100,
    phoneNumber: 20,
    shippingAddress: 200,
    notes: 500,
  },

  // ── Quotations ───────────────────────────────────────────────────────────────
  quotation: {
    customerName: 100,
    customerAddress: 200,
    companyName: 100,
    notes: 2000,
    userMessage: 2000,
    adminReply: 2000,
    terms: 2000,
  },

  // ── Contact Us ────────────────────────────────────────────────────────────────
  contact: {
    firstName: 100,
    lastName: 100,
    phone: 20,
    subject: 120,
    message: 5000,
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  notification: {
    title: 255,
    message: 2000,
  },

  // ── Company Settings ──────────────────────────────────────────────────────────
  settings: {
    companyName: 255,
    companyEmail: 255,
    companyPhone: 20,
    companyAddress: 500,
    companyLocation: 500,
    paymentGatewayKey: 500,
    paymentWebhookUrl: 2048,
  },

  // ── Application ───────────────────────────────────────────────────────────────
  application: {
    applicationName: 255,
    description: 2000,
  },

  // ── Users (Admin create/edit) ─────────────────────────────────────────────────
  user: {
    fullName: 100,
    email: 254,
    phoneNumber: 20,
    companyName: 100,
    password: 32,
  },

  // ── Super Admin ────────────────────────────────────────────────────────────────
  superAdmin: {
    name: 25,
    phone: 15,
    suspensionReason: 500,
  },

  // ── Payment ────────────────────────────────────────────────────────────────────
  payment: {
    notes: 1000,
  },
} as const;
