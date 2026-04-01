import { Module } from '@nestjs/common';

import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';


@Module({
  imports: [],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
