import { Module } from '@nestjs/common';
import { SupplierNetworksService } from './supplier-networks.service';
import { SupplierNetworksController } from './supplier-networks.controller';

@Module({
  controllers: [SupplierNetworksController],
  providers: [SupplierNetworksService],
  exports: [SupplierNetworksService],
})
export class SupplierNetworksModule {}

