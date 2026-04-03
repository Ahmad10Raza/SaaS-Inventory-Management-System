import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantProvisionerService } from './tenant-provisioner.service';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { MasterIndustry, MasterIndustrySchema } from '../../schemas/master-industry.schema';
import { MasterCategory, MasterCategorySchema } from '../../schemas/master-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: MasterIndustry.name, schema: MasterIndustrySchema },
      { name: MasterCategory.name, schema: MasterCategorySchema },
    ]),
  ],
  providers: [TenantProvisionerService],
  exports: [TenantProvisionerService],
})
export class TenantModule {}
