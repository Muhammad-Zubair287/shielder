/**
 * Terms and Conditions Service
 */

import prisma from '@/config/database';

export interface TermsAndConditionsData {
  contentEn: string;
  contentAr: string;
  updatedAt?: string | null;
}

class TermsAndConditionsService {
  /**
   * Get terms and conditions (singleton record)
   */
  async getTermsAndConditions(): Promise<TermsAndConditionsData> {
    let record = await prisma.termsAndConditions.findFirst();

    if (!record) {
      // Create default record if it doesn't exist
      record = await prisma.termsAndConditions.create({
        data: {
          contentEn: '',
          contentAr: '',
        },
      });
    }

    return {
      contentEn: record.contentEn,
      contentAr: record.contentAr,
      updatedAt: record.updatedAt?.toISOString() || undefined,
    };
  }

  /**
   * Update terms and conditions
   */
  async updateTermsAndConditions(userId: string, contentEn: string, contentAr: string): Promise<TermsAndConditionsData> {
    const record = await prisma.termsAndConditions.findFirst();

    if (!record) {
      const newRecord = await prisma.termsAndConditions.create({
        data: {
          contentEn,
          contentAr,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      return {
        contentEn: newRecord.contentEn,
        contentAr: newRecord.contentAr,
        updatedAt: newRecord.updatedAt?.toISOString() || undefined,
      };
    }

    const updatedRecord = await prisma.termsAndConditions.update({
      where: { id: record.id },
      data: {
        contentEn,
        contentAr,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    return {
      contentEn: updatedRecord.contentEn,
      contentAr: updatedRecord.contentAr,
      updatedAt: updatedRecord.updatedAt?.toISOString() || undefined,
    };
  }
}

export default new TermsAndConditionsService();