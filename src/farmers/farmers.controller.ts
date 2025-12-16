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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { FarmersService } from './farmers.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Farmers')
@ApiBearerAuth('JWT-auth')
@Controller('farmers')
@UseGuards(JwtAuthGuard)
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new farmer profile', description: 'Admin only. Creates a new farmer profile with user account.' })
  @ApiResponse({ status: 201, description: 'Farmer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createFarmerDto: CreateFarmerDto) {
    return this.farmersService.create(createFarmerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all farmers', description: 'Returns a paginated list of farmers with optional filters' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'district', required: false, description: 'Filter by district' })
  @ApiQuery({ name: 'cropType', required: false, description: 'Filter by crop type' })
  @ApiQuery({ name: 'qualityGrade', required: false, description: 'Filter by quality grade' })
  @ApiQuery({ name: 'verified', required: false, description: 'Filter by verification status (true/false)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Farmers retrieved successfully' })
  findAll(
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('cropType') cropType?: string,
    @Query('qualityGrade') qualityGrade?: string,
    @Query('verified') verified?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.farmersService.findAll({
      region,
      district,
      cropType,
      qualityGrade,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get farmer statistics', description: 'Returns aggregated statistics about farmers on the platform' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.farmersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get farmer by ID', description: 'Returns detailed information about a specific farmer' })
  @ApiParam({ name: 'id', description: 'Farmer ID' })
  @ApiResponse({ status: 200, description: 'Farmer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Farmer not found' })
  findOne(@Param('id') id: string) {
    return this.farmersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update farmer profile', description: 'Updates farmer profile information' })
  @ApiParam({ name: 'id', description: 'Farmer ID' })
  @ApiResponse({ status: 200, description: 'Farmer updated successfully' })
  @ApiResponse({ status: 404, description: 'Farmer not found' })
  update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
    return this.farmersService.update(id, updateFarmerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete farmer', description: 'Admin only. Permanently deletes a farmer profile' })
  @ApiParam({ name: 'id', description: 'Farmer ID' })
  @ApiResponse({ status: 200, description: 'Farmer deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Farmer not found' })
  remove(@Param('id') id: string) {
    return this.farmersService.remove(id);
  }
}

