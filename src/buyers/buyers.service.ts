import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

@Injectable()
export class BuyersService {
  private readonly logger = new Logger(BuyersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createBuyerDto: CreateBuyerDto) {
    this.logger.log(`Creating buyer: ${createBuyerDto.userId}`);
    
    try {
      const buyer = await this.prisma.buyer.create({
        data: createBuyerDto,
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
      });
      
      this.logger.log(`Buyer created successfully: ${buyer.id} (${buyer.user?.email})`);
      return buyer;
    } catch (error) {
      this.logger.error(`Error creating buyer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filters?: {
    country?: string;
    industry?: string;
    seekingCrops?: string[];
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.country) where.country = filters.country;
    if (filters?.industry) where.industry = filters.industry;
    if (filters?.seekingCrops && filters.seekingCrops.length > 0) {
      where.seekingCrops = {
        hasSome: filters.seekingCrops,
      };
    }

    const [buyers, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
              verified: true,
            },
          },
        },
      }),
      this.prisma.buyer.count({ where }),
    ]);

    return {
      data: buyers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUserId(userId: string) {
    try {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
              verified: true,
            },
          },
          matches: {
            include: {
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
              listing: true,
            },
          },
          transactions: true,
        },
      });

      if (!buyer) {
        // Return null instead of throwing error - buyer profile might not exist yet
        return null;
      }

      return buyer;
    } catch (error) {
      this.logger.error(`Error finding buyer by userId ${userId}: ${error.message}`);
      return null;
    }
  }

  async findOne(id: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            verified: true,
          },
        },
        matches: {
          include: {
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
            listing: true,
          },
        },
        transactions: true,
      },
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${id} not found`);
    }

    return buyer;
  }

  async update(id: string, updateBuyerDto: UpdateBuyerDto) {
    await this.findOne(id);
    return this.prisma.buyer.update({
      where: { id },
      data: updateBuyerDto,
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
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.buyer.delete({ where: { id } });
    return { message: 'Buyer deleted successfully' };
  }
}

