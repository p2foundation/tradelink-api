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
import { FarmersService } from './farmers.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('farmers')
@UseGuards(JwtAuthGuard)
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() createFarmerDto: CreateFarmerDto) {
    return this.farmersService.create(createFarmerDto);
  }

  @Get()
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
  getStats() {
    return this.farmersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
    return this.farmersService.update(id, updateFarmerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.farmersService.remove(id);
  }
}

