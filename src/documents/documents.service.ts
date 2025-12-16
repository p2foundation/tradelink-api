import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentDto, DocumentType, DocumentStatus } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    this.logger.log(`Creating document: ${createDocumentDto.name} for user: ${userId}`);

    // Check if user exists and get their role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { farmer: true, buyer: true, exportCompany: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine expiry date - set default expiry for certain document types
    let expiryDate = createDocumentDto.expiryDate
      ? new Date(createDocumentDto.expiryDate)
      : null;

    if (!expiryDate && createDocumentDto.type === DocumentType.EXPORT_LICENSE) {
      // Export licenses typically valid for 1 year
      expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Check if document is expired
    const status =
      expiryDate && expiryDate < new Date() ? DocumentStatus.EXPIRED : DocumentStatus.PENDING;

    const document = await this.prisma.document.create({
      data: {
        name: createDocumentDto.name,
        type: createDocumentDto.type,
        fileUrl: createDocumentDto.fileUrl,
        description: createDocumentDto.description,
        expiryDate,
        status,
        referenceNumber: createDocumentDto.referenceNumber,
        issuedBy: createDocumentDto.issuedBy,
        userId,
        transactionId: createDocumentDto.transactionId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        transaction: {
          select: {
            id: true,
            totalValue: true,
            currency: true,
          },
        },
      },
    });

    this.logger.log(`Document created: ${document.id}`);
    return document;
  }

  async findAll(filters?: {
    userId?: string;
    type?: DocumentType;
    status?: DocumentStatus;
    transactionId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.transactionId) where.transactionId = filters.transactionId;

    // Check for expired documents
    const now = new Date();
    await this.prisma.document.updateMany({
      where: {
        expiryDate: { lt: now },
        status: { not: DocumentStatus.EXPIRED },
      },
      data: { status: DocumentStatus.EXPIRED },
    });

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
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
              role: true,
            },
          },
          transaction: {
            select: {
              id: true,
              totalValue: true,
              currency: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        transaction: {
          select: {
            id: true,
            totalValue: true,
            currency: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, userId: string) {
    const document = await this.findOne(id);

    // Check if user has permission (owner or admin)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (document.userId !== userId && user?.role !== 'ADMIN') {
      throw new BadRequestException('You do not have permission to update this document');
    }

    // If status is being updated to VERIFIED, set verifiedAt
    const updateData: any = { ...updateDocumentDto };
    if (updateDocumentDto.status === DocumentStatus.VERIFIED && !document.verifiedAt) {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = userId;
    }

    return this.prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async verify(id: string, userId: string, notes?: string) {
    const document = await this.findOne(id);

    // Only admins can verify documents
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') {
      throw new BadRequestException('Only admins can verify documents');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationNotes: notes,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async reject(id: string, userId: string, notes: string) {
    const document = await this.findOne(id);

    // Only admins can reject documents
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') {
      throw new BadRequestException('Only admins can reject documents');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.REJECTED,
        verificationNotes: notes,
        verifiedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id);

    // Check if user has permission (owner or admin)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (document.userId !== userId && user?.role !== 'ADMIN') {
      throw new BadRequestException('You do not have permission to delete this document');
    }

    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document deleted successfully' };
  }

  async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, verified, pending, expired, rejected] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.count({ where: { ...where, status: DocumentStatus.VERIFIED } }),
      this.prisma.document.count({ where: { ...where, status: DocumentStatus.PENDING } }),
      this.prisma.document.count({ where: { ...where, status: DocumentStatus.EXPIRED } }),
      this.prisma.document.count({ where: { ...where, status: DocumentStatus.REJECTED } }),
    ]);

    return {
      total,
      verified,
      pending,
      expired,
      rejected,
    };
  }
}

