import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateNegotiationDto } from './dto/create-negotiation.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { RespondOfferDto } from './dto/respond-offer.dto';
import { NegotiationStatus, OfferStatus } from '@prisma/client';

@Injectable()
export class NegotiationsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateNegotiationDto, userId: string) {
    // Check if match exists
    const match = await this.prisma.match.findUnique({
      where: { id: createDto.matchId },
      include: { listing: true },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Check if negotiation already exists
    const existing = await this.prisma.negotiation.findFirst({
      where: { matchId: createDto.matchId, status: NegotiationStatus.ACTIVE },
    });

    if (existing) {
      throw new BadRequestException('Active negotiation already exists for this match');
    }

    // Update match status to NEGOTIATING
    await this.prisma.match.update({
      where: { id: createDto.matchId },
      data: {
        status: 'NEGOTIATING',
        negotiationStartedAt: new Date(),
      },
    });

    // Extract initiatedBy from DTO if provided, otherwise use userId from auth
    const initiatedBy = createDto.initiatedBy || userId;
    
    if (!initiatedBy) {
      throw new BadRequestException('initiatedBy is required');
    }

    return this.prisma.negotiation.create({
      data: {
        matchId: createDto.matchId,
        initialPrice: createDto.initialPrice,
        currentPrice: createDto.currentPrice,
        quantity: createDto.quantity,
        currency: createDto.currency || 'USD',
        terms: createDto.terms,
        deliveryTerms: createDto.deliveryTerms,
        paymentTerms: createDto.paymentTerms,
        initiatedBy: String(initiatedBy), // Ensure it's a string
        lastUpdatedBy: String(userId || initiatedBy), // Ensure it's a string
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
      },
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
        offers: {
          orderBy: { createdAt: 'desc' },
          include: {
            negotiation: true,
          },
        },
      },
    });
  }

  async findAll(matchId?: string, userId?: string) {
    const where: any = {};
    
    if (matchId) {
      // If matchId is provided, just filter by matchId
      // The match already establishes the relationship between farmer and buyer
      where.matchId = matchId;
    } else if (userId) {
      // If no matchId but userId is provided, filter by user's matches
      // Get user's farmer and buyer profiles to check access
      const [farmer, buyer] = await Promise.all([
        this.prisma.farmer.findFirst({ where: { userId } }),
        this.prisma.buyer.findFirst({ where: { userId } }),
      ]);
      
      // Build access filter based on user's roles
      const accessConditions: any[] = [];
      
      if (farmer) {
        accessConditions.push({ match: { farmerId: farmer.id } });
      }
      
      if (buyer) {
        accessConditions.push({ match: { buyerId: buyer.id } });
      }
      
      // If user has no farmer or buyer profile, they can't access any negotiations
      if (accessConditions.length === 0) {
        return [];
      }
      
      where.AND = [
        {
          OR: accessConditions,
        },
      ];
    }

    return this.prisma.negotiation.findMany({
      where,
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
        offers: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
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
        offers: {
          orderBy: { createdAt: 'desc' },
        },
        transaction: true,
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    return negotiation;
  }

  async createOffer(createDto: CreateOfferDto) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: createDto.negotiationId },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Negotiation is not active');
    }

    // Update negotiation current price
    await this.prisma.negotiation.update({
      where: { id: createDto.negotiationId },
      data: {
        currentPrice: createDto.price,
        quantity: createDto.quantity,
        lastUpdatedBy: createDto.offeredBy,
      },
    });

    return this.prisma.offer.create({
      data: createDto,
      include: {
        negotiation: true,
      },
    });
  }

  async respondToOffer(offerId: string, respondDto: RespondOfferDto, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { negotiation: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer has already been responded to');
    }

    // Update offer
    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: respondDto.status,
        responseMessage: respondDto.responseMessage,
        respondedAt: new Date(),
      },
    });

    // If accepted, create counter-offer or accept negotiation
    if (respondDto.status === OfferStatus.ACCEPTED) {
      await this.prisma.negotiation.update({
        where: { id: offer.negotiationId },
        data: {
          status: NegotiationStatus.ACCEPTED,
          acceptedAt: new Date(),
          lastUpdatedBy: userId,
        },
      });
    }

    return updatedOffer;
  }

  async acceptNegotiation(id: string, userId: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            listing: true,
            buyer: true,
            farmer: true,
          },
        },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Negotiation is not active');
    }

    // Check if transaction already exists for this negotiation
    let transaction = await this.prisma.transaction.findUnique({
      where: { negotiationId: id },
    });

    // Create transaction if it doesn't exist
    if (!transaction) {
      transaction = await this.prisma.transaction.create({
        data: {
          matchId: negotiation.matchId,
          negotiationId: id,
          buyerId: negotiation.match.buyerId,
          quantity: negotiation.quantity,
          agreedPrice: negotiation.currentPrice,
          totalValue: negotiation.currentPrice * negotiation.quantity,
          currency: negotiation.currency,
          paymentStatus: 'pending',
          shipmentStatus: 'pending',
        },
      });
    }

    // Update negotiation
    const updated = await this.prisma.negotiation.update({
      where: { id },
      data: {
        status: NegotiationStatus.ACCEPTED,
        acceptedAt: new Date(),
        lastUpdatedBy: userId,
      },
      include: {
        transaction: true,
      },
    });

    // Update match status
    await this.prisma.match.update({
      where: { id: negotiation.matchId },
      data: {
        status: 'CONTRACT_SIGNED',
        contractSignedAt: new Date(),
      },
    });

    return {
      ...updated,
      transactionId: transaction.id,
    };
  }

  async rejectNegotiation(id: string, userId: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
    });

    if (!negotiation) {
      throw new NotFoundException('Negotiation not found');
    }

    return this.prisma.negotiation.update({
      where: { id },
      data: {
        status: NegotiationStatus.REJECTED,
        rejectedAt: new Date(),
        lastUpdatedBy: userId,
      },
    });
  }
}

