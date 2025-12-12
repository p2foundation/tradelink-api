import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  findAll(
    @Query('farmerId') farmerId?: string,
    @Query('buyerId') buyerId?: string,
    @Query('listingId') listingId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchesService.findAll({
      farmerId,
      buyerId,
      listingId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('suggest')
  async suggestMatches(
    @Query('buyerId') buyerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchesService.suggestMatches(buyerId, limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  create(@Body() createMatchDto: CreateMatchDto, @Request() req) {
    // Allow buyers to create matches directly from listings
    // JWT strategy returns { sub, email, role }, where sub is the userId
    return this.matchesService.create(createMatchDto, req.user?.sub);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMatchStatusDto,
  ) {
    return this.matchesService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }
}

