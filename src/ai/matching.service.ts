import { Injectable } from '@nestjs/common';
import { Buyer, Listing } from '@prisma/client';
import { AiClientService } from './ai-client.service';

interface MatchResult {
  listingId: string;
  farmerId: string;
  score: number;
  estimatedValue: number;
  reasons: string[];
}

@Injectable()
export class MatchingService {
  constructor(private aiClient: AiClientService) {}

  async findMatches(
    buyer: Buyer,
    listings: (Listing & { farmer: any })[],
    limit: number = 10,
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    for (const listing of listings) {
      const score = this.calculateCompatibilityScore(buyer, listing);
      
      // Use AI to generate intelligent recommendations
      let reasons: string[];
      try {
        reasons = await this.aiClient.generateMatchRecommendation(buyer, listing, score);
      } catch (error) {
        // Fallback to rule-based reasons if AI fails
        reasons = this.getMatchReasons(buyer, listing, score);
      }

      if (score > 30) {
        // Only include matches with score > 30
        matches.push({
          listingId: listing.id,
          farmerId: listing.farmerId,
          score: Math.round(score * 100) / 100,
          estimatedValue: listing.quantity * listing.pricePerUnit,
          reasons,
        });
      }
    }

    // Sort by score descending and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCompatibilityScore(
    buyer: Buyer,
    listing: Listing & { farmer: any },
  ): number {
    let score = 0;
    const maxScore = 100;

    // 0. International compliance check (must pass to be considered)
    // This ensures farmers/traders are verified for export
    if (!listing.farmer?.user?.verified) {
      // Unverified farmers get very low score, but not zero (for internal matches)
      // For international buyers, this should be a hard requirement
      if (buyer.country && buyer.country !== 'GH') {
        return 0; // International buyers only see verified suppliers
      }
      score -= 20; // Penalty for unverified
    } else {
      score += 5; // Bonus for verified status
    }

    // 1. Crop type compatibility (30 points)
    const cropMatch = buyer.seekingCrops.some(
      (crop) => crop.toLowerCase() === listing.cropType.toLowerCase(),
    );
    if (cropMatch) {
      score += 30;
    } else {
      // Partial match
      const partialMatch = buyer.seekingCrops.some((crop) =>
        listing.cropType.toLowerCase().includes(crop.toLowerCase()),
      );
      if (partialMatch) {
        score += 15;
      }
    }

    // 2. Quality grade match (25 points)
    const qualityMatch = buyer.qualityStandards.some((standard) => {
      const standardLower = standard.toLowerCase();
      const gradeLower = listing.qualityGrade.toLowerCase();
      return standardLower.includes(gradeLower) || gradeLower.includes(standardLower);
    });
    if (qualityMatch) {
      score += 25;
    } else {
      // Premium buyers prefer premium grades
      if (
        buyer.qualityStandards.some((s) => s.toLowerCase().includes('premium')) &&
        listing.qualityGrade === 'PREMIUM'
      ) {
        score += 20;
      }
    }

    // 3. Quantity requirements (20 points)
    if (buyer.volumeRequired) {
      const volumeMatch = this.parseVolume(buyer.volumeRequired);
      if (volumeMatch) {
        const { amount, unit } = volumeMatch;
        const listingQuantity = listing.quantity;
        const listingUnit = listing.unit || 'tons';

        if (unit === listingUnit || (unit === 'ton' && listingUnit === 'tons')) {
          const ratio = listingQuantity / amount;
          if (ratio >= 0.8 && ratio <= 1.2) {
            score += 20; // Perfect match
          } else if (ratio >= 0.5 && ratio <= 2) {
            score += 15; // Good match
          } else if (ratio >= 0.3 && ratio <= 3) {
            score += 10; // Acceptable match
          }
        }
      }
    } else {
      // No specific requirement, give medium score
      score += 10;
    }

    // 4. Price compatibility (15 points)
    // This is simplified - in production, compare with market prices
    if (listing.pricePerUnit > 0) {
      score += 10; // Base score for having a price
      // Could add price range matching here
    }

    // 5. Availability timeline (10 points)
    const now = new Date();
    if (listing.availableFrom <= now) {
      score += 10; // Available now
    } else {
      const daysUntilAvailable =
        (listing.availableFrom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilAvailable <= 30) {
        score += 7; // Available soon
      } else if (daysUntilAvailable <= 90) {
        score += 4; // Available in near future
      }
    }

    return Math.min(score, maxScore);
  }

  private getMatchReasons(
    buyer: Buyer,
    listing: Listing & { farmer: any },
    score: number,
  ): string[] {
    const reasons: string[] = [];

    const cropMatch = buyer.seekingCrops.some(
      (crop) => crop.toLowerCase() === listing.cropType.toLowerCase(),
    );
    if (cropMatch) {
      reasons.push(`Crop type matches buyer requirements: ${listing.cropType}`);
    }

    const qualityMatch = buyer.qualityStandards.some((standard) => {
      const standardLower = standard.toLowerCase();
      const gradeLower = listing.qualityGrade.toLowerCase();
      return standardLower.includes(gradeLower) || gradeLower.includes(standardLower);
    });
    if (qualityMatch) {
      reasons.push(`Quality grade (${listing.qualityGrade}) meets buyer standards`);
    }

    if (listing.quantity >= 10) {
      reasons.push(`Large quantity available: ${listing.quantity} ${listing.unit}`);
    }

    if (listing.certifications && listing.certifications.length > 0) {
      reasons.push(
        `Certifications: ${listing.certifications.join(', ')}`,
      );
    }

    if (score >= 70) {
      reasons.push('High compatibility score - excellent match');
    } else if (score >= 50) {
      reasons.push('Good compatibility score - strong match');
    }

    return reasons;
  }

  private parseVolume(volumeString: string): { amount: number; unit: string } | null {
    const match = volumeString.match(/(\d+(?:\.\d+)?)\s*(tons?|kg|tonnes?)/i);
    if (match) {
      return {
        amount: parseFloat(match[1]),
        unit: match[2].toLowerCase().replace(/s$/, ''),
      };
    }
    return null;
  }
}

