/**
 * Browser console helper to set trusted device cookies
 * Run this in your browser console on localhost to set the device cookie
 * 
 * For Superadmin:
 * window.setTrustedDeviceCookie('8cf79dd95e083dec042004bed6c8b121ec8016bf7872cc4751bc7cee7e64bec6')
 * 
 * For Admin:
 * window.setTrustedDeviceCookie('b6cac6dd6522411f3ab2b0dfabdc1c258aeedd80fb551722388405e8ae0f8693')
 */

window.setTrustedDeviceCookie = function(token) {
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 30);
  
  // Set cookie directly
  document.cookie = `trustedDeviceToken=${token}; path=/; expires=${expiresDate.toUTCString()}; SameSite=Lax`;
  
  console.log('✅ Trusted device cookie set!');
  console.log(`   Token: ${token}`);
  console.log(`   Expires: ${expiresDate.toLocaleString()}`);
  console.log('\n🔓 You can now login without 2FA!\n');
};

// Auto-set for superadmin when this script runs
window.setTrustedDeviceTokenSuperadmin = () => {
  window.setTrustedDeviceCookie('8cf79dd95e083dec042004bed6c8b121ec8016bf7872cc4751bc7cee7e64bec6');
};

// Auto-set for admin when this script runs
window.setTrustedDeviceTokenAdmin = () => {
  window.setTrustedDeviceCookie('b6cac6dd6522411f3ab2b0dfabdc1c258aeedd80fb551722388405e8ae0f8693');
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 TRUSTED DEVICE HELPER LOADED                   ║
╚════════════════════════════════════════════════════════════════╝

🔐 Available Commands:

For Superadmin (superadmin@shielder.com):
  window.setTrustedDeviceTokenSuperadmin()
  
For Admin (admin@shielder.com):
  window.setTrustedDeviceTokenAdmin()

Or manually:
  window.setTrustedDeviceCookie('TOKEN_HERE')

✨ After setting, you'll skip 2FA on next login!
`);
