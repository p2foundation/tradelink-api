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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Matches')
@ApiBearerAuth('JWT-auth')
@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all matches', description: 'Returns a paginated list of buyer-listing matches' })
  @ApiQuery({ name: 'farmerId', required: false, description: 'Filter by farmer ID' })
  @ApiQuery({ name: 'buyerId', required: false, description: 'Filter by buyer ID' })
  @ApiQuery({ name: 'listingId', required: false, description: 'Filter by listing ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by match status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Matches retrieved successfully' })
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
  @ApiOperation({ summary: 'Generate AI match suggestions', description: 'Uses AI to generate match suggestions for a buyer based on their preferences and available listings' })
  @ApiQuery({ name: 'buyerId', required: true, description: 'Buyer ID to generate suggestions for' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of suggestions (default: 10)' })
  @ApiResponse({ status: 200, description: 'Match suggestions generated successfully' })
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  async suggestMatches(
    @Query('buyerId') buyerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchesService.suggestMatches(buyerId, limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get match by ID', description: 'Returns detailed information about a specific match' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiResponse({ status: 200, description: 'Match retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a match', description: 'Creates a new match between a buyer and listing. Auto-creates buyer profile if needed.' })
  @ApiResponse({ status: 201, description: 'Match created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createMatchDto: CreateMatchDto, @Request() req) {
    return this.matchesService.create(createMatchDto, req.user?.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update match status', description: 'Updates the status of a match (e.g., CONTACTED, NEGOTIATING, COMPLETED)' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiResponse({ status: 200, description: 'Match status updated successfully' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMatchStatusDto,
  ) {
    return this.matchesService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete match', description: 'Admin only. Permanently deletes a match' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiResponse({ status: 200, description: 'Match deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }
}

