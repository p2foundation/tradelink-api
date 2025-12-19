import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchingService } from '../ai/matching.service';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
  ) {}

  async findAll(filters?: {
    farmerId?: string;
    buyerId?: string;
    listingId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.farmerId) where.farmerId = filters.farmerId;
    if (filters?.buyerId) where.buyerId = filters.buyerId;
    if (filters?.listingId) where.listingId = filters.listingId;
    if (filters?.status) where.status = filters.status;

    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        skip,
        take: limit,
        include: {
          listing: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatar: true,
                },
              },
            },
          },
          buyer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: {
          compatibilityScore: 'desc',
        },
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      data: matches,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            farmer: {
              include: {
                user: true,
              },
            },
          },
        },
        farmer: {
          include: {
            user: true,
          },
        },
        buyer: {
          include: {
            user: true,
          },
        },
        transactions: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return match;
  }

  async suggestMatches(buyerId: string, limit: number = 10) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${buyerId} not found`);
    }

    // For international buyers, only show verified farmers/traders
    const whereClause: any = { status: 'ACTIVE' };
    
    // If buyer is from outside Ghana, only show verified suppliers
    if (buyer.country && buyer.country !== 'GH') {
      whereClause.farmer = {
        user: {
          verified: true,
        },
      };
    }

    // Get active listings
    const listings = await this.prisma.listing.findMany({
      where: whereClause,
      include: {
        farmer: {
          include: {
            user: {
              include: {
                documents: {
                  where: {
                    status: 'VERIFIED',
                  },
                },
              },
            },
          },
        },
      },
    });

    // Use AI matching service
    const matches = await this.matchingService.findMatches(buyer, listings, limit);

    // Create match records
    const matchPromises = matches.map((match) =>
      this.prisma.match.create({
        data: {
          listingId: match.listingId,
          farmerId: match.farmerId,
          buyerId: buyerId,
          compatibilityScore: match.score,
          estimatedValue: match.estimatedValue,
          aiRecommendation: JSON.stringify(match.reasons),
          status: 'SUGGESTED',
        },
        include: {
          listing: true,
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          buyer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    );

    return Promise.all(matchPromises);
  }

  async create(createMatchDto: CreateMatchDto, userId?: string) {
    // If buyerId is not provided but userId is, look up the buyer
    let buyerId = createMatchDto.buyerId;
    if (!buyerId && userId) {
      let buyer = await this.prisma.buyer.findFirst({
        where: { userId },
      });
      
      // If buyer profile doesn't exist, create one automatically
      if (!buyer) {
        // Get user to check role and get basic info
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!user) {
          throw new NotFoundException('User not found');
        }
        
        if (user.role !== 'BUYER') {
          throw new BadRequestException('User must have BUYER role to create matches');
        }
        
        // Create buyer profile with default values
        this.logger.log(`Auto-creating buyer profile for user: ${userId}`);
        buyer = await this.prisma.buyer.create({
          data: {
            userId: user.id,
            companyName: `${user.firstName} ${user.lastName}`,
            country: 'GH', // Default to Ghana
            countryName: 'Ghana',
            industry: 'Agriculture',
            seekingCrops: [],
            qualityStandards: [],
          },
        });
        this.logger.log(`Buyer profile created: ${buyer.id}`);
      }
      
      buyerId = buyer.id;
    }

    if (!buyerId) {
      throw new BadRequestException('buyerId is required or user must have a buyer profile');
    }

    // Get listing to calculate estimated value
    const listing = await this.prisma.listing.findUnique({
      where: { id: createMatchDto.listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Calculate compatibility score (simplified - in production use AI matching)
    // Use provided value or calculate default
    const compatibilityScore = createMatchDto.compatibilityScore ?? 85;
    const estimatedValue = createMatchDto.estimatedValue ?? listing.pricePerUnit * listing.quantity;

    return this.prisma.match.create({
      data: {
        ...createMatchDto,
        buyerId,
        compatibilityScore,
        estimatedValue,
        status: createMatchDto.status ?? 'CONTACTED', // Direct orders start as CONTACTED
        contactedAt: new Date(),
      },
      include: {
        listing: true,
        farmer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateMatchStatusDto) {
    const match = await this.findOne(id);

    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Update timestamps based on status
    if (updateStatusDto.status === 'CONTACTED' && !match.contactedAt) {
      updateData.contactedAt = new Date();
    } else if (updateStatusDto.status === 'NEGOTIATING' && !match.negotiationStartedAt) {
      updateData.negotiationStartedAt = new Date();
    } else if (updateStatusDto.status === 'CONTRACT_SIGNED' && !match.contractSignedAt) {
      updateData.contractSignedAt = new Date();
    } else if (updateStatusDto.status === 'COMPLETED' && !match.completedAt) {
      updateData.completedAt = new Date();
    }

    return this.prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        listing: true,
        farmer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.match.delete({ where: { id } });
    return { message: 'Match deleted successfully' };
  }
}

