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
import { BuyersService } from './buyers.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('buyers')
@UseGuards(JwtAuthGuard)
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Post()
  create(@Body() createBuyerDto: CreateBuyerDto) {
    return this.buyersService.create(createBuyerDto);
  }

  @Get()
  findAll(
    @Query('country') country?: string,
    @Query('industry') industry?: string,
    @Query('seekingCrops') seekingCrops?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.buyersService.findAll({
      country,
      industry,
      seekingCrops: seekingCrops ? seekingCrops.split(',') : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('me')
  getCurrentBuyer(@CurrentUser() user: any) {
    return this.buyersService.findByUserId(user.sub);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.buyersService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buyersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBuyerDto: UpdateBuyerDto) {
    return this.buyersService.update(id, updateBuyerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.buyersService.remove(id);
  }
}

