import { Module } from '@nestjs/common';

import { InventoryController } from './inventory.controller';
import { ValidationService } from './validation.service';
import { InventoryService } from './inventory.service';




@Module({
  imports: [],
  controllers: [InventoryController],
  providers: [InventoryService, ValidationService],
  exports: [InventoryService, ValidationService],
})
export class InventoryModule {}
