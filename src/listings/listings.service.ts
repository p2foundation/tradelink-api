import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createListingDto: CreateListingDto, userId: string) {
    this.logger.log(`Creating listing for user: ${userId}, crop: ${createListingDto.cropType}`);
    
    try {
      // Verify farmer exists and belongs to user
      let farmer = await this.prisma.farmer.findUnique({
        where: { userId },
      });

      // If farmer profile doesn't exist, create one automatically
      if (!farmer) {
        // Get user to check role and get basic info
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!user) {
          throw new NotFoundException('User not found');
        }
        
        if (user.role !== 'FARMER') {
          throw new ForbiddenException('User must have FARMER role to create listings');
        }
        
        // Create farmer profile with default values
        this.logger.log(`Auto-creating farmer profile for user: ${userId}`);
        farmer = await this.prisma.farmer.create({
          data: {
            userId: user.id,
            businessName: `${user.firstName} ${user.lastName}`,
            location: 'Ghana',
            district: 'Unknown',
            region: 'Unknown',
            certifications: [],
          },
        });
        this.logger.log(`Farmer profile created: ${farmer.id}`);
      }

      const listing = await this.prisma.listing.create({
        data: {
          ...createListingDto,
          farmerId: farmer.id,
        },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Listing created successfully: ${listing.id} (${createListingDto.cropType})`);
      return listing;
    } catch (error) {
      this.logger.error(`Error creating listing: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filters?: {
    cropType?: string;
    qualityGrade?: string;
    status?: string;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    availableFrom?: Date;
    availableUntil?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: filters?.status || 'ACTIVE',
    };

    if (filters?.cropType) where.cropType = filters.cropType;
    if (filters?.qualityGrade) where.qualityGrade = filters.qualityGrade;
    if (filters?.minPrice || filters?.maxPrice) {
      where.pricePerUnit = {};
      if (filters?.minPrice) where.pricePerUnit.gte = filters.minPrice;
      if (filters?.maxPrice) where.pricePerUnit.lte = filters.maxPrice;
    }
    if (filters?.availableFrom) where.availableFrom = { gte: filters.availableFrom };
    if (filters?.availableUntil) where.availableUntil = { lte: filters.availableUntil };
    if (filters?.region) {
      where.farmer = { region: filters.region };
    }

    const orderBy: any = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        matches: {
          include: {
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
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    return listing;
  }

  async update(id: string, updateListingDto: UpdateListingDto, userId: string) {
    const listing = await this.findOne(id);

    // Verify ownership
    const farmer = await this.prisma.farmer.findUnique({
      where: { userId },
    });

    if (listing.farmerId !== farmer?.id) {
      throw new ForbiddenException('You can only update your own listings');
    }

    return this.prisma.listing.update({
      where: { id },
      data: updateListingDto,
      include: {
        farmer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const listing = await this.findOne(id);

    // Verify ownership
    const farmer = await this.prisma.farmer.findUnique({
      where: { userId },
    });

    if (listing.farmerId !== farmer?.id) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.prisma.listing.delete({ where: { id } });
    return { message: 'Listing deleted successfully' };
  }

  async search(query: string) {
    return this.prisma.listing.findMany({
      where: {
        OR: [
          { cropType: { contains: query, mode: 'insensitive' } },
          { cropVariety: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
      },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      take: 20,
    });
  }
}

