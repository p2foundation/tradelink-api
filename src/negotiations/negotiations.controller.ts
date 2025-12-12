import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { NegotiationsService } from './negotiations.service';
import { CreateNegotiationDto } from './dto/create-negotiation.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { RespondOfferDto } from './dto/respond-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('negotiations')
@UseGuards(JwtAuthGuard)
export class NegotiationsController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  @Post()
  create(@Body() createDto: CreateNegotiationDto, @Request() req) {
    return this.negotiationsService.create(createDto, req.user?.sub || req.user?.userId);
  }

  @Get()
  findAll(@Query('matchId') matchId?: string, @Request() req?) {
    return this.negotiationsService.findAll(matchId, req?.user?.sub || req?.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.negotiationsService.findOne(id);
  }

  @Post(':id/offers')
  createOffer(@Param('id') negotiationId: string, @Body() createDto: CreateOfferDto, @Request() req) {
    return this.negotiationsService.createOffer({
      ...createDto,
      negotiationId,
      offeredBy: req.user?.sub || req.user?.userId,
    });
  }

  @Patch('offers/:offerId/respond')
  respondToOffer(@Param('offerId') offerId: string, @Body() respondDto: RespondOfferDto, @Request() req) {
    return this.negotiationsService.respondToOffer(offerId, respondDto, req.user?.sub || req.user?.userId);
  }

  @Post(':id/accept')
  acceptNegotiation(@Param('id') id: string, @Request() req) {
    return this.negotiationsService.acceptNegotiation(id, req.user?.sub || req.user?.userId);
  }

  @Post(':id/reject')
  rejectNegotiation(@Param('id') id: string, @Request() req) {
    return this.negotiationsService.rejectNegotiation(id, req.user?.sub || req.user?.userId);
  }
}

