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
import { SupplierNetworksService } from './supplier-networks.service';
import { CreateSupplierNetworkDto } from './dto/create-supplier-network.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Supplier Networks')
@ApiBearerAuth('JWT-auth')
@Controller('supplier-networks')
@UseGuards(JwtAuthGuard)
export class SupplierNetworksController {
  constructor(
    private readonly supplierNetworksService: SupplierNetworksService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add farmer to supplier network', description: 'Export companies can add farmers to their supplier network. Automatically calculates performance metrics.' })
  @ApiResponse({ status: 201, description: 'Farmer added to supplier network successfully' })
  @ApiResponse({ status: 400, description: 'Farmer already in network or invalid input' })
  @ApiResponse({ status: 404, description: 'Farmer or export company not found' })
  async create(@Body() createDto: CreateSupplierNetworkDto, @Request() req) {
    const userId = req.user?.sub || req.user?.userId;
    
    // Get export company for this user
    const exportCompany = await this.prisma.exportCompany.findFirst({
      where: { userId },
    });

    if (!exportCompany) {
      throw new Error('Export company profile not found');
    }

    return this.supplierNetworksService.create(createDto, exportCompany.id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get supplier network', description: 'Returns all farmers in the export company\'s supplier network with performance metrics' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by relationship status' })
  @ApiQuery({ name: 'relationshipType', required: false, description: 'Filter by relationship type' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Supplier network retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('relationshipType') relationshipType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    const userId = req?.user?.sub || req?.user?.userId;
    
    // Get export company for this user
    const exportCompany = await this.prisma.exportCompany.findFirst({
      where: { userId },
    });

    if (!exportCompany) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    return this.supplierNetworksService.findAll(exportCompany.id, {
      status,
      relationshipType,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get supplier network statistics', description: 'Returns aggregated statistics about the supplier network' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req) {
    const userId = req.user?.sub || req.user?.userId;
    
    const exportCompany = await this.prisma.exportCompany.findFirst({
      where: { userId },
    });

    if (!exportCompany) {
      return {
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalDeals: 0,
        totalValue: 0,
      };
    }

    return this.supplierNetworksService.getStats(exportCompany.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier relationship details', description: 'Returns detailed information about a specific supplier relationship including transaction history' })
  @ApiParam({ name: 'id', description: 'Supplier network relationship ID' })
  @ApiResponse({ status: 200, description: 'Supplier relationship retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  findOne(@Param('id') id: string) {
    return this.supplierNetworksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier relationship', description: 'Updates supplier relationship metadata (status, contract dates, notes)' })
  @ApiParam({ name: 'id', description: 'Supplier network relationship ID' })
  @ApiResponse({ status: 200, description: 'Relationship updated successfully' })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.supplierNetworksService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove supplier from network', description: 'Removes a farmer from the supplier network' })
  @ApiParam({ name: 'id', description: 'Supplier network relationship ID' })
  @ApiResponse({ status: 200, description: 'Supplier removed successfully' })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  remove(@Param('id') id: string) {
    return this.supplierNetworksService.remove(id);
  }
}

