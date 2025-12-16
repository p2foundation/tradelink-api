import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSupplierNetworkDto } from './dto/create-supplier-network.dto';

@Injectable()
export class SupplierNetworksService {
  private readonly logger = new Logger(SupplierNetworksService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateSupplierNetworkDto, exportCompanyId: string, userId: string) {
    // Verify export company exists
    const exportCompany = await this.prisma.exportCompany.findUnique({
      where: { id: exportCompanyId },
    });

    if (!exportCompany) {
      throw new NotFoundException('Export company not found');
    }

    // Verify farmer exists
    const farmer = await this.prisma.farmer.findUnique({
      where: { id: createDto.farmerId },
      include: { user: true },
    });

    if (!farmer) {
      throw new NotFoundException('Farmer not found');
    }

    // Check if relationship already exists
    const existing = await this.prisma.supplierNetwork.findUnique({
      where: {
        exportCompanyId_farmerId: {
          exportCompanyId,
          farmerId: createDto.farmerId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('This farmer is already in your supplier network');
    }

    // Create supplier network relationship
    const supplierNetwork = await this.prisma.supplierNetwork.create({
      data: {
        exportCompanyId,
        farmerId: createDto.farmerId,
        relationshipType: createDto.relationshipType || 'DIRECT',
        contractStartDate: createDto.contractStartDate ? new Date(createDto.contractStartDate) : null,
        contractEndDate: createDto.contractEndDate ? new Date(createDto.contractEndDate) : null,
        notes: createDto.notes,
        addedBy: userId,
      },
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
                verified: true,
              },
            },
            listings: {
              where: { status: 'ACTIVE' },
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    this.logger.log(`Supplier network created: ${supplierNetwork.id} for export company: ${exportCompanyId}`);
    return supplierNetwork;
  }

  async findAll(exportCompanyId: string, filters?: {
    status?: string;
    relationshipType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { exportCompanyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.relationshipType) where.relationshipType = filters.relationshipType;

    const [networks, total] = await Promise.all([
      this.prisma.supplierNetwork.findMany({
        where,
        skip,
        take: limit,
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
                  verified: true,
                },
              },
              listings: {
                where: { status: 'ACTIVE' },
                take: 3,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      }),
      this.prisma.supplierNetwork.count({ where }),
    ]);

    // Calculate performance metrics for each farmer
    const networksWithMetrics = await Promise.all(
      networks.map(async (network) => {
        // Get transactions with this farmer through export company
        const transactions = await this.prisma.transaction.findMany({
          where: {
            exportCompanyId,
            match: {
              farmerId: network.farmerId,
            },
          },
          include: {
            match: {
              include: {
                listing: true,
              },
            },
          },
        });

        const totalDeals = transactions.length;
        const totalValue = transactions.reduce((sum, tx) => sum + (tx.totalValue || 0), 0);
        const completedTransactions = transactions.filter((tx) => tx.paymentStatus === 'completed');
        const qualityScore = completedTransactions.length > 0 ? 85 + Math.random() * 10 : null; // Mock for now
        const reliabilityScore = completedTransactions.length > 0 ? 80 + Math.random() * 15 : null; // Mock for now
        const lastDealDate = transactions.length > 0
          ? transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null;

        // Update metrics in database
        await this.prisma.supplierNetwork.update({
          where: { id: network.id },
          data: {
            totalDeals,
            totalValue,
            qualityScore,
            reliabilityScore,
            lastDealDate: lastDealDate ? new Date(lastDealDate) : null,
          },
        });

        return {
          ...network,
          metrics: {
            totalDeals,
            totalValue,
            qualityScore,
            reliabilityScore,
            lastDealDate,
            activeListings: network.farmer.listings.length,
          },
        };
      }),
    );

    return {
      data: networksWithMetrics,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const network = await this.prisma.supplierNetwork.findUnique({
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
                verified: true,
              },
            },
            listings: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        exportCompany: {
          select: {
            id: true,
            companyName: true,
            registrationNo: true,
          },
        },
      },
    });

    if (!network) {
      throw new NotFoundException('Supplier network relationship not found');
    }

    // Get transaction history
    const transactions = await this.prisma.transaction.findMany({
      where: {
        exportCompanyId: network.exportCompanyId,
        match: {
          farmerId: network.farmerId,
        },
      },
      include: {
        match: {
          include: {
            listing: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...network,
      transactionHistory: transactions,
    };
  }

  async update(id: string, updateData: {
    status?: string;
    relationshipType?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    notes?: string;
  }) {
    const network = await this.findOne(id);

    const data: any = {};
    if (updateData.status) data.status = updateData.status;
    if (updateData.relationshipType) data.relationshipType = updateData.relationshipType;
    if (updateData.contractStartDate) data.contractStartDate = new Date(updateData.contractStartDate);
    if (updateData.contractEndDate) data.contractEndDate = new Date(updateData.contractEndDate);
    if (updateData.notes !== undefined) data.notes = updateData.notes;

    return this.prisma.supplierNetwork.update({
      where: { id },
      data,
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
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.supplierNetwork.delete({ where: { id } });
    return { message: 'Supplier removed from network successfully' };
  }

  async getStats(exportCompanyId: string) {
    const [total, active, totalDeals, totalValue] = await Promise.all([
      this.prisma.supplierNetwork.count({ where: { exportCompanyId } }),
      this.prisma.supplierNetwork.count({ where: { exportCompanyId, status: 'ACTIVE' } }),
      this.prisma.supplierNetwork.aggregate({
        where: { exportCompanyId },
        _sum: { totalDeals: true },
      }),
      this.prisma.supplierNetwork.aggregate({
        where: { exportCompanyId },
        _sum: { totalValue: true },
      }),
    ]);

    return {
      totalSuppliers: total,
      activeSuppliers: active,
      totalDeals: totalDeals._sum.totalDeals || 0,
      totalValue: totalValue._sum.totalValue || 0,
    };
  }
}

