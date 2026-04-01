import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantProvisionerService } from './tenant-provisioner.service';
import { Company, CompanySchema } from '../../schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
  ],
  providers: [TenantProvisionerService],
  exports: [TenantProvisionerService],
})
export class TenantModule {}
