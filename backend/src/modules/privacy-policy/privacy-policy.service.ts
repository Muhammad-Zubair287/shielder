/**
 * Privacy Policy Service
 */

import prisma from '@/config/database';

class PrivacyPolicyService {
  /**
   * Get Privacy Policy
   * Initializes with default content if not found
   */
  async getPrivacyPolicy() {
    let policy = await prisma.privacyPolicy.findUnique({
      where: { id: 'CURRENT' }
    });

    if (!policy) {
      // Default initial content
      policy = await prisma.privacyPolicy.create({
        data: {
          id: 'CURRENT',
          contentEn: '<h1>Privacy Policy</h1><p>Our English privacy policy details...</p>',
          contentAr: '<h1>سياسة الخصوصية</h1><p>تفاصيل سياسة الخصوصية باللغة العربية...</p>'
        }
      });
    }

    return policy;
  }

  /**
   * Update Privacy Policy
   */
  async updatePrivacyPolicy(userId: string, contentEn: string, contentAr: string) {
    const policy = await prisma.privacyPolicy.upsert({
      where: { id: 'CURRENT' },
      update: {
        contentEn,
        contentAr,
        updatedBy: userId,
        updatedAt: new Date()
      },
      create: {
        id: 'CURRENT',
        contentEn,
        contentAr,
        updatedBy: userId
      }
    });

    return policy;
  }
}

export default new PrivacyPolicyService();
