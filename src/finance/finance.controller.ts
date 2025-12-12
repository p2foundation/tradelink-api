import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceApplicationDto } from './dto/create-finance-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('options')
  async getOptions(@CurrentUser() user: any) {
    return this.financeService.getAvailableOptions(user.sub);
  }

  @Post('apply')
  async createApplication(
    @CurrentUser() user: any,
    @Body() createDto: CreateFinanceApplicationDto,
  ) {
    return this.financeService.createApplication(user.sub, createDto);
  }

  @Get('applications')
  async getApplications(@CurrentUser() user: any) {
    return this.financeService.getApplications(user.sub);
  }
}

