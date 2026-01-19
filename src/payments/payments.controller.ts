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
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createDto, req.user?.sub || req.user?.userId);
  }

  @Get()
  findAll(@Query('transactionId') transactionId?: string, @Request() req?) {
    return this.paymentsService.findAll(transactionId, req?.user?.sub || req?.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.paymentsService.findOne(id, req.user?.sub || req.user?.userId);
  }

  @Post(':id/upload-receipt')
  uploadReceipt(@Param('id') id: string, @Body() uploadDto: UploadReceiptDto, @Request() req) {
    return this.paymentsService.uploadReceipt(id, uploadDto, req.user?.sub || req.user?.userId);
  }

  @Post(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  verifyPayment(@Param('id') id: string, @Body() body: { notes?: string }, @Request() req) {
    return this.paymentsService.verifyManualPayment(id, req.user?.sub || req.user?.userId, body.notes);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  rejectPayment(@Param('id') id: string, @Body() body: { notes: string }, @Request() req) {
    return this.paymentsService.rejectManualPayment(id, req.user?.sub || req.user?.userId, body.notes);
  }

  @Post(':id/callback')
  processCallback(
    @Param('id') id: string,
    @Body() body: { status: PaymentStatus; providerResponse?: any },
    @Headers('x-payment-signature') signature?: string,
  ) {
    return this.paymentsService.processPaymentCallback(id, body.status, body.providerResponse, signature);
  }
}

