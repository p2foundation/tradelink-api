import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';

@Injectable()
export class FarmersService {
  private readonly logger = new Logger(FarmersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createFarmerDto: CreateFarmerDto) {
    this.logger.log(`Creating farmer: ${createFarmerDto.userId}`);
    
    try {
      const farmer = await this.prisma.farmer.create({
        data: createFarmerDto,
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
      
      this.logger.log(`Farmer created successfully: ${farmer.id} (${farmer.user?.email})`);
      return farmer;
    } catch (error) {
      this.logger.error(`Error creating farmer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filters?: {
    region?: string;
    district?: string;
    cropType?: string;
    qualityGrade?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.region) where.region = filters.region;
    if (filters?.district) where.district = filters.district;
    if (filters?.verified !== undefined) {
      where.user = { verified: filters.verified };
    }

    const listingsInclude =
      filters?.cropType || filters?.qualityGrade
        ? {
            where: {
              ...(filters?.cropType && { cropType: filters.cropType }),
              ...(filters?.qualityGrade && { qualityGrade: filters.qualityGrade as any }),
            },
          }
        : true;

    const [farmers, total] = await Promise.all([
      this.prisma.farmer.findMany({
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
          listings: listingsInclude,
        },
      }),
      this.prisma.farmer.count({ where }),
    ]);

    return {
      data: farmers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    this.logger.debug(`Finding farmer: ${id}`);
    
    try {
      const farmer = await this.prisma.farmer.findUnique({
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
          listings: true,
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

      if (!farmer) {
        this.logger.warn(`Farmer not found: ${id}`);
        throw new NotFoundException(`Farmer with ID ${id} not found`);
      }

      this.logger.debug(`Farmer found: ${id} (${farmer.user?.email})`);
      return farmer;
    } catch (error) {
      this.logger.error(`Error finding farmer ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateFarmerDto: UpdateFarmerDto) {
    this.logger.log(`Updating farmer: ${id}`);
    
    try {
      await this.findOne(id);
      const farmer = await this.prisma.farmer.update({
        where: { id },
        data: updateFarmerDto,
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
      
      this.logger.log(`Farmer updated successfully: ${id}`);
      return farmer;
    } catch (error) {
      this.logger.error(`Error updating farmer ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting farmer: ${id}`);
    
    try {
      await this.findOne(id);
      await this.prisma.farmer.delete({ where: { id } });
      this.logger.log(`Farmer deleted successfully: ${id}`);
      return { message: 'Farmer deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting farmer ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStats() {
    const [total, byRegion, byDistrict] = await Promise.all([
      this.prisma.farmer.count(),
      this.prisma.farmer.groupBy({
        by: ['region'],
        _count: true,
      }),
      this.prisma.farmer.groupBy({
        by: ['district'],
        _count: true,
      }),
    ]);

    return {
      total,
      byRegion,
      byDistrict,
    };
  }
}

