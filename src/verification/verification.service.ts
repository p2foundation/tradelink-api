import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface GhanaSingleWindowSubmission {
  userId: string;
  userType: 'FARMER' | 'TRADER' | 'EXPORT_COMPANY';
  businessName: string;
  registrationNumber?: string;
  documents: {
    type: string;
    documentId: string;
    fileUrl: string;
  }[];
}

export interface VerificationStatus {
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  referenceNumber?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Submit user for Ghana Single Window verification
   * This integrates with Ghana Single Window system for export approval
   */
  async submitToGhanaSingleWindow(
    userId: string,
    submission: GhanaSingleWindowSubmission,
  ): Promise<{ referenceNumber: string; status: string }> {
    this.logger.log(`Submitting user ${userId} to Ghana Single Window`);

    // TODO: Integrate with actual Ghana Single Window API
    // For now, this is a mock implementation
    
    // Check if user has required documents
    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        status: 'VERIFIED',
      },
    });

    // Required documents for export
    const requiredDocs = [
      'GEPA_LICENSE',
      'CERTIFICATE_OF_ORIGIN',
      'QUALITY_CERTIFICATE',
    ];

    const hasRequiredDocs = requiredDocs.every((docType) =>
      documents.some((doc) => doc.type === docType),
    );

    if (!hasRequiredDocs) {
      throw new Error(
        'Missing required documents. Please upload: GEPA License, Certificate of Origin, and Quality Certificate',
      );
    }

    // Generate reference number (in real implementation, this comes from Ghana SW)
    const referenceNumber = `GSW-${Date.now()}-${userId.slice(0, 6).toUpperCase()}`;

    // Store verification request
    // In real implementation, this would call Ghana Single Window API
    // and store the response
    this.logger.log(
      `Verification submitted: ${referenceNumber} for user ${userId}`,
    );

    // Update user verification status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verified: false, // Will be set to true after Ghana SW approval
      },
    });

    return {
      referenceNumber,
      status: 'PENDING',
    };
  }

  /**
   * Check verification status from Ghana Single Window
   */
  async checkVerificationStatus(
    referenceNumber: string,
  ): Promise<VerificationStatus> {
    this.logger.log(`Checking verification status: ${referenceNumber}`);

    // TODO: Call Ghana Single Window API to get actual status
    // For now, return mock status

    // In real implementation:
    // const response = await this.ghanaSingleWindowClient.getStatus(referenceNumber);
    // return this.mapGhanaSWResponseToStatus(response);

    return {
      status: 'UNDER_REVIEW',
      referenceNumber,
      submittedAt: new Date(),
    };
  }

  /**
   * Approve verification (called by admin after Ghana SW approval)
   */
  async approveVerification(
    userId: string,
    referenceNumber: string,
    approvedBy: string,
    notes?: string,
  ): Promise<void> {
    this.logger.log(
      `Approving verification for user ${userId}: ${referenceNumber}`,
    );

    // Update user as verified
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verified: true,
      },
    });

    // Update buyer/export company with Ghana SW reference
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId },
    });

    if (buyer) {
      await this.prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          // Add Ghana SW reference fields when schema is updated
        },
      });
    }

    const exportCompany = await this.prisma.exportCompany.findUnique({
      where: { userId },
    });

    if (exportCompany) {
      await this.prisma.exportCompany.update({
        where: { id: exportCompany.id },
        data: {
          // Add Ghana SW reference fields when schema is updated
        },
      });
    }

    this.logger.log(`User ${userId} verified and approved for export`);
  }

  /**
   * Check if user meets requirements for international export
   */
  async checkExportEligibility(userId: string): Promise<{
    eligible: boolean;
    missingRequirements: string[];
    recommendations: string[];
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          documents: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const missingRequirements: string[] = [];
      const recommendations: string[] = [];

      // Check basic verification
      if (!user.verified) {
        missingRequirements.push('User account verification');
        recommendations.push('Complete account verification process');
      }

      // Check required documents
      const requiredDocs = [
        'GEPA_LICENSE',
        'CERTIFICATE_OF_ORIGIN',
        'QUALITY_CERTIFICATE',
      ];

      // Handle documents array - it might be empty or undefined
      const userDocTypes = (user.documents || [])
        .filter((d) => {
          // Handle enum comparison - status can be string or enum value
          const status = String(d.status).toUpperCase();
          return status === 'VERIFIED';
        })
        .map((d) => String(d.type).toUpperCase());

      requiredDocs.forEach((docType) => {
        if (!userDocTypes.includes(docType.toUpperCase())) {
          const docName = docType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          missingRequirements.push(docName);
          recommendations.push(`Upload and verify ${docName}`);
        }
      });

      // Check if user has active listings (for farmers/traders)
      if (user.role === 'FARMER' || user.role === 'TRADER') {
        try {
          const listings = await this.prisma.listing.count({
            where: {
              farmer: {
                userId: user.id,
              },
              status: 'ACTIVE',
            },
          });

          if (listings === 0) {
            recommendations.push('Create at least one active product listing');
          }
        } catch (error) {
          // If listing query fails, just log and continue
          this.logger.warn(`Error checking listings for user ${userId}: ${error}`);
        }
      }

      return {
        eligible: missingRequirements.length === 0,
        missingRequirements,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error checking export eligibility for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get country-specific compliance requirements for buyers
   */
  getCountryComplianceRequirements(countryCode: string): {
    requiredDocuments: string[];
    qualityStandards: string[];
    certifications: string[];
    notes: string[];
  } {
    const requirements: Record<
      string,
      {
        requiredDocuments: string[];
        qualityStandards: string[];
        certifications: string[];
        notes: string[];
      }
    > = {
      US: {
        requiredDocuments: [
          'FDA_REGISTRATION',
          'USDA_CERTIFICATE',
          'CERTIFICATE_OF_ORIGIN',
          'PHYTOSANITARY_CERTIFICATE',
        ],
        qualityStandards: ['FDA', 'USDA'],
        certifications: ['ORGANIC_CERTIFICATION', 'FAIR_TRADE_CERTIFICATION'],
        notes: [
          'Products must meet FDA food safety standards',
          'USDA approval required for agricultural products',
          'Country of Origin labeling required',
        ],
      },
      GB: {
        requiredDocuments: [
          'EU_TRACES',
          'CERTIFICATE_OF_ORIGIN',
          'PHYTOSANITARY_CERTIFICATE',
          'HEALTH_CERTIFICATE',
        ],
        qualityStandards: ['EU_FOOD_SAFETY', 'HACCP'],
        certifications: ['ORGANIC_CERTIFICATION', 'FAIR_TRADE_CERTIFICATION'],
        notes: [
          'EU TRACES registration required',
          'Must comply with EU food safety regulations',
          'Organic certification recommended for premium products',
        ],
      },
      CN: {
        requiredDocuments: [
          'AQSIQ_CERTIFICATE',
          'IMPORT_PERMIT',
          'CERTIFICATE_OF_ORIGIN',
          'QUALITY_CERTIFICATE',
        ],
        qualityStandards: ['AQSIQ', 'CHINA_STANDARDS'],
        certifications: ['QUALITY_CERTIFICATE'],
        notes: [
          'AQSIQ approval required',
          'Import permits must be obtained before shipment',
          'Quality inspection mandatory',
        ],
      },
      // Add more countries as needed
    };

    return (
      requirements[countryCode.toUpperCase()] || {
        requiredDocuments: ['CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE'],
        qualityStandards: ['INTERNATIONAL'],
        certifications: [],
        notes: ['Check with local import authorities for specific requirements'],
      }
    );
  }
}
