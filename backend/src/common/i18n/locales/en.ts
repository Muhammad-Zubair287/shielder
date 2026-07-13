export const en: Record<string, string> = {
  // ── Common ─────────────────────────────────────────────────────────────────
  'common.internalError':      'An internal error occurred. Please try again.',
  'common.notFound':           'Resource not found.',
  'common.unauthorized':       'Unauthorized. Please log in.',
  'common.forbidden':          'You do not have permission to perform this action.',
  'common.badRequest':         'Bad request.',
  'common.conflict':           'A conflict occurred.',
  'common.tooManyRequests':    'Too many requests. Please try again later.',
  'common.rateLimitMinutes':   'Too many attempts. Please try again in {{minutes}} minute(s).',
  'common.validationFailed':   'Validation failed.',
  'common.routeNotFound':      'The requested endpoint does not exist.',

  // ── Validation (Joi type mapping) ──────────────────────────────────────────
  'validation.failed':         'Validation failed.',
  'validation.required':       'This field is required.',
  'validation.invalidEmail':   'Please provide a valid email address.',
  'validation.stringMin':      'Must be at least {{limit}} characters.',
  'validation.stringMax':      'Must not exceed {{limit}} characters.',
  'validation.numberMin':      'Must be at least {{limit}}.',
  'validation.numberMax':      'Must not exceed {{limit}}.',
  'validation.numberInteger':  'Must be a whole number.',
  'validation.numberBase':     'Must be a number.',
  'validation.stringBase':     'Must be a text value.',
  'validation.invalidFormat':  'Invalid format.',
  'validation.invalidUrl':     'Must be a valid URL.',
  'validation.invalidUUID':    'Invalid ID format.',
  'validation.invalidDate':    'Invalid date.',
  'validation.dateFuture':     'Date must be in the future.',
  'validation.arrayMin':       'Must have at least {{limit}} item(s).',
  'validation.arrayMax':       'Must not exceed {{limit}} items.',
  'validation.invalidEnum':    'Invalid value.',
  'validation.booleanBase':    'Must be true or false.',
  'validation.unknownField':   'Unknown field provided.',
  'validation.passwordWeak':   'Password must contain uppercase, lowercase, number, and special character.',
  'validation.passwordCommon': 'Password is too common. Please choose a stronger password.',
  'validation.passwordMax':    'Password must be at most {{limit}} characters.',
  'validation.invalidPhone':   'Please provide a valid phone number (e.g. 05XXXXXXXX or +966 5X XXX XXXX).',
  'validation.htmlNotAllowed': 'HTML content is not allowed.',
  'validation.invalidName':    'Invalid name format.',

  // ── Authentication ─────────────────────────────────────────────────────────
  'auth.registerSuccessAutoVerified':    'Registration successful. Your account has been auto-verified.',
  'auth.registerSuccessEmailRequired':   'Registration successful. Please check your email to verify your account.',
  'auth.emailNotVerified':               'Please verify your email before continuing.',
  'auth.loginSuccess':                   'Login successful.',
  'auth.refreshTokenRequired':           'Refresh token is required.',
  'auth.tokensRefreshed':                'Tokens refreshed successfully.',
  'auth.logoutSuccess':                  'Logged out successfully.',
  'auth.logoutAllSuccess':               'Logged out from all devices successfully.',
  'auth.forgotPasswordEmailSent':        'If the email exists, a password reset link has been sent.',
  'auth.forgotPasswordOtpSent':          'If the email exists, an OTP has been sent.',
  'auth.forgotPasswordOtpResent':        'If the email exists, a new OTP has been sent.',
  'auth.otpVerified':                    'OTP verified successfully.',
  'auth.passwordResetSuccess':           'Password reset successful. Please login with your new password.',
  'auth.passwordChangedSuccess':         'Password changed successfully. Please login again on all devices.',
  'auth.emailVerified':                  'Email verified successfully.',
  'auth.sessionRevoked':                 'Session revoked successfully.',
  'auth.trustedDeviceRevoked':           'Trusted device revoked.',
  'auth.otpSent':                        'OTP has been sent to your {{method}}.',
  'auth.twoFaSuccess':                   '2FA verification successful.',
  'auth.emailVerifiedLogin':             'Email verified successfully. Please login to continue.',
  'auth.newVerificationCodeSent':        'A new verification code has been sent to your email.',
  'auth.emailUpdatedVerificationSent':   'Email updated successfully. A verification code was sent to your new address.',
  'auth.devModeAutoVerified':            'Development mode: email delivery unavailable, account auto-verified.',
  'auth.resendVerificationSent':         'If the email exists and is unverified, a verification link has been sent.',

  // ── Profile ────────────────────────────────────────────────────────────────
  'profile.updateSuccess':      'Profile updated successfully.',
  'profile.languageUpdated':    'Language preference updated successfully.',
  'profile.preferencesUpdated': 'Preferences updated successfully.',
  'profile.noFileUploaded':     'No file uploaded.',
  'profile.imageUploaded':      'Profile image uploaded successfully.',

  // ── Category ───────────────────────────────────────────────────────────────
  'category.createSuccess':     'Category created successfully.',
  'category.updateSuccess':     'Category updated successfully.',
  'category.deleteSuccess':     'Category deleted successfully.',
  'category.bulkDelete':        'Bulk delete completed.',
  'category.notFound':          'Category not found.',

  // ── Subcategory ────────────────────────────────────────────────────────────
  'subcategory.createSuccess':  'Subcategory created successfully.',
  'subcategory.updateSuccess':  'Subcategory updated successfully.',
  'subcategory.deleteSuccess':  'Subcategory deleted successfully.',
  'subcategory.bulkDelete':     'Bulk delete completed.',
  'subcategory.notFound':       'Subcategory not found.',

  // ── Product ────────────────────────────────────────────────────────────────
  'product.noFileUploaded':         'Please upload a file.',
  'product.noImageFile':            'No image file provided.',
  'product.dbUpdateFailed':         'Database update failed — image path not saved.',
  'product.specificationsAssigned': 'Specifications assigned successfully.',
  'product.attachmentDeleted':      'Attachment deleted successfully.',
  'product.createSuccess':          'Product created successfully.',
  'product.updateSuccess':          'Product updated successfully.',
  'product.deleteSuccess':          'Product deleted successfully.',
  'product.bulkDelete':             'Bulk delete completed.',
  'product.notFound':               'Product not found.',
  'product.insufficientStock':      'Insufficient stock for this product.',

  // ── Order ──────────────────────────────────────────────────────────────────
  'order.paymentStatusLocked': 'Payment status cannot be changed once marked as PAID.',
  'order.createSuccess':       'Order created successfully.',
  'order.listSuccess':         'Orders retrieved successfully.',
  'order.getSuccess':          'Order retrieved successfully.',
  'order.updateSuccess':       'Order status updated successfully.',
  'order.summarySuccess':      'Order summary retrieved successfully.',
  'order.notFound':            'Order not found.',
  'order.cannotCancel':        'This order cannot be cancelled.',

  // ── Cart ───────────────────────────────────────────────────────────────────
  'cart.itemAdded':    'Item added to cart.',
  'cart.updated':      'Cart updated.',
  'cart.itemRemoved':  'Item removed from cart.',
  'cart.cleared':      'Cart cleared.',
  'cart.itemNotFound': 'Cart item not found.',

  // ── Quotation (Admin) ──────────────────────────────────────────────────────
  'quotation.sent':        'Quotation sent successfully.',
  'quotation.approved':    'Quotation approved.',
  'quotation.rejected':    'Quotation rejected.',
  'quotation.converted':   'Quotation converted to order successfully.',
  'quotation.reactivated': 'Quotation reactivated successfully.',
  'quotation.expired':     '{{count}} quotation(s) expired.',
  'quotation.notFound':    'Quotation not found.',

  // ── Customer Quotation ────────────────────────────────────────────────────
  'customerQuotation.noProductsNoBasket': 'No products provided and quotation basket is empty.',
  'customerQuotation.companyRequired':    'Company name is required.',
  'customerQuotation.vatRequired':        'VAT number is required.',
  'customerQuotation.vatInvalid':         'VAT number format is invalid (10–20 digits).',
  'customerQuotation.addressRequired':    'Address is required.',
  'customerQuotation.productRequired':    'At least one product is required.',
  'customerQuotation.quantityMin':        'Quantity must be at least 1.',
  'customerQuotation.productNotFound':    'Product not found: {{productId}}',
  'customerQuotation.productUnavailable': 'Product is no longer available: {{productId}}',
  'customerQuotation.notFound':           'Quotation not found.',
  'customerQuotation.cannotAccept':       'Quotation cannot be accepted in its current status.',
  'customerQuotation.acceptSuccess':      'Quotation accepted successfully.',
  'customerQuotation.cannotReject':       'Quotation cannot be rejected in its current status.',
  'customerQuotation.rejectSuccess':      'Quotation rejected successfully.',

  // ── Customer Quotation Basket ──────────────────────────────────────────────
  'basket.itemAdded':    'Item added to quotation basket.',
  'basket.itemUpdated':  'Item quantity updated.',
  'basket.itemRemoved':  'Item removed from quotation basket.',
  'basket.cleared':      'Quotation basket cleared.',
  'basket.itemNotFound': 'Item not found in basket.',

  // ── Contact ────────────────────────────────────────────────────────────────
  'contact.submitSuccess': 'Your message has been submitted successfully.',

  // ── Payment ────────────────────────────────────────────────────────────────
  'payment.recorded':  'Payment recorded successfully.',
  'payment.refunded':  'Refund processed successfully.',
  'payment.notFound':  'Payment not found.',
  'payment.statusLocked': 'Payment already recorded and cannot be changed.',

  // ── Warehouse ──────────────────────────────────────────────────────────────
  'warehouse.createSuccess': 'Warehouse created successfully.',
  'warehouse.updateSuccess': 'Warehouse updated successfully.',
  'warehouse.deleteSuccess': 'Warehouse deleted successfully.',
  'warehouse.notFound':      'Warehouse not found.',

  // ── Settings ───────────────────────────────────────────────────────────────
  'settings.updateSuccess':  'Settings updated successfully.',
  'settings.logoUploaded':   'Company logo uploaded successfully.',
  'settings.backupTriggered':'Backup triggered successfully.',
  'settings.notFound':       'Settings not found.',

  // ── Application ────────────────────────────────────────────────────────────
  'application.createSuccess':  'Application created successfully.',
  'application.updateSuccess':  'Application updated successfully.',
  'application.deleteSuccess':  'Application deleted successfully.',
  'application.statusUpdated':  'Application status updated successfully.',
  'application.notFound':       'Application not found.',

  // ── Privacy Policy ─────────────────────────────────────────────────────────
  'privacyPolicy.updateSuccess': 'Privacy policy updated successfully.',
  'privacyPolicy.notFound':      'Privacy policy not found.',

  // ── Super Admin ────────────────────────────────────────────────────────────
  'superAdmin.userCreated':      'User created successfully.',
  'superAdmin.userUpdated':      'User updated successfully.',
  'superAdmin.userDeleted':      'User deleted successfully.',
  'superAdmin.inquiryResolved':  'Inquiry resolved successfully.',
  'superAdmin.userNotFound':     'User not found.',

  // ── Admin ──────────────────────────────────────────────────────────────────
  'admin.userCreated':           'User created successfully.',
  'admin.userUpdated':           'User updated successfully.',
  'admin.userStatusUpdated':     'User status updated successfully.',
  'admin.userPasswordReset':     'Password reset email sent successfully.',
  'admin.userDeleted':           'User deleted successfully.',
  'admin.userNotFound':          'User not found.',

  // ── Newsletter ─────────────────────────────────────────────────────────────
  'newsletter.subscribeSuccess': 'Successfully subscribed to the newsletter.',

  // ── Notification ───────────────────────────────────────────────────────────
  'notification.markedRead':    'Notification marked as read.',
  'notification.allMarkedRead': 'All notifications marked as read.',
  'notification.deleted':       'Notification deleted successfully.',
  'notification.created':       'Notification created and broadcast successfully.',
  'notification.notFound':      'Notification not found.',

  // ── Inventory Alert ────────────────────────────────────────────────────────
  'inventoryAlert.createSuccess':   'Inventory alert created.',
  'inventoryAlert.updateSuccess':   'Inventory alert updated.',
  'inventoryAlert.deleteSuccess':   'Inventory alert deleted.',
  'inventoryAlert.checksTriggered': 'Alert checks triggered.',
  'inventoryAlert.notFound':        'Inventory alert not found.',

  // ── Product Review ─────────────────────────────────────────────────────────
  'productReview.addSuccess':    'Review submitted successfully.',
  'productReview.approveSuccess':'Review status updated.',
  'productReview.notFound':      'Review not found.',
};
