import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: createTransactionDto,
      include: {
        match: {
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
        exportCompany: true,
      },
    });
  }

  async findAll(filters?: {
    buyerId?: string;
    exportCompanyId?: string;
    paymentStatus?: string;
    shipmentStatus?: string;
    negotiationId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.buyerId) where.buyerId = filters.buyerId;
    if (filters?.exportCompanyId) where.exportCompanyId = filters.exportCompanyId;
    if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters?.shipmentStatus) where.shipmentStatus = filters.shipmentStatus;
    if (filters?.negotiationId) where.negotiationId = filters.negotiationId;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          match: {
            include: {
              listing: true,
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
          exportCompany: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            listing: true,
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
          },
        },
        buyer: {
          include: {
            user: true,
          },
        },
        exportCompany: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    await this.findOne(id);
    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
      include: {
        match: {
          include: {
            listing: true,
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
        exportCompany: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.transaction.delete({ where: { id } });
    return { message: 'Transaction deleted successfully' };
  }

  async getStats() {
    const [total, totalValue, byPaymentStatus, byShipmentStatus] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        _sum: {
          totalValue: true,
        },
      }),
      this.prisma.transaction.groupBy({
        by: ['paymentStatus'],
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['shipmentStatus'],
        _count: true,
      }),
    ]);

    return {
      total,
      totalValue: totalValue._sum.totalValue || 0,
      byPaymentStatus,
      byShipmentStatus,
    };
  }
}

