import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePaymentDto, userId: string) {
    // Verify transaction exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: createDto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // For integrated payments, initiate payment with provider
    let providerResponse = null;
    let providerTransactionId = null;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

    if (!createDto.isManual) {
      // TODO: Integrate with actual payment providers
      // For now, simulate payment initiation
      providerResponse = JSON.stringify({
        status: 'initiated',
        provider: createDto.provider,
        timestamp: new Date().toISOString(),
      });
      paymentStatus = PaymentStatus.PROCESSING;
    }

    const payment = await this.prisma.payment.create({
      data: {
        ...createDto,
        currency: createDto.currency || 'USD',
        paymentStatus,
        providerResponse,
        providerTransactionId,
        isManual: createDto.isManual || false,
        receiptDate: createDto.receiptDate ? new Date(createDto.receiptDate) : null,
        uploadedBy: createDto.isManual ? userId : null,
      },
      include: {
        transaction: {
          include: {
            match: {
              include: {
                listing: true,
              },
            },
          },
        },
      },
    });

    // Update transaction payment status
    if (payment.paymentStatus === PaymentStatus.COMPLETED) {
      await this.prisma.transaction.update({
        where: { id: createDto.transactionId },
        data: {
          paymentStatus: 'paid',
          paymentDate: new Date(),
        },
      });
    }

    return payment;
  }

  async findAll(transactionId?: string, userId?: string) {
    const where: any = {};
    if (transactionId) where.transactionId = transactionId;
    if (userId) {
      // Get user's farmer and buyer profiles to check access
      const [farmer, buyer] = await Promise.all([
        this.prisma.farmer.findFirst({ where: { userId } }),
        this.prisma.buyer.findFirst({ where: { userId } }),
      ]);
      
      const accessConditions: any[] = [];
      
      if (buyer) {
        accessConditions.push({ buyerId: buyer.id });
      }
      
      if (farmer) {
        accessConditions.push({ match: { farmerId: farmer.id } });
      }
      
      if (accessConditions.length === 0) {
        return [];
      }
      
      where.transaction = {
        OR: accessConditions,
      };
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        transaction: {
          include: {
            match: {
              include: {
                listing: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            match: {
              include: {
                listing: true,
                farmer: {
                  include: { user: true },
                },
                buyer: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async uploadReceipt(paymentId: string, uploadDto: UploadReceiptDto, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.isManual) {
      throw new BadRequestException('This payment is not a manual payment');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptDocument: uploadDto.receiptDocument,
        receiptNumber: uploadDto.receiptNumber,
        receiptDate: new Date(uploadDto.receiptDate),
        uploadedBy: userId,
        paymentStatus: PaymentStatus.PENDING, // Awaiting verification
      },
    });
  }

  async verifyManualPayment(paymentId: string, verifiedBy: string, notes?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { transaction: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.isManual) {
      throw new BadRequestException('This payment is not a manual payment');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: PaymentStatus.VERIFIED,
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: notes,
        paidAt: new Date(),
      },
    });

    // Update transaction
    await this.prisma.transaction.update({
      where: { id: payment.transactionId },
      data: {
        paymentStatus: 'paid',
        paymentDate: new Date(),
      },
    });

    return updated;
  }

  async rejectManualPayment(paymentId: string, verifiedBy: string, notes: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: PaymentStatus.REJECTED,
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: notes,
      },
    });
  }

  async processPaymentCallback(paymentId: string, status: PaymentStatus, providerResponse?: any) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { transaction: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: status,
        providerResponse: providerResponse ? JSON.stringify(providerResponse) : payment.providerResponse,
        paidAt: status === PaymentStatus.COMPLETED ? new Date() : null,
        failureReason: status === PaymentStatus.FAILED ? 'Payment failed' : null,
      },
    });

    // Update transaction if payment completed
    if (status === PaymentStatus.COMPLETED) {
      await this.prisma.transaction.update({
        where: { id: payment.transactionId },
        data: {
          paymentStatus: 'paid',
          paymentDate: new Date(),
        },
      });
    }

    return updated;
  }
}

