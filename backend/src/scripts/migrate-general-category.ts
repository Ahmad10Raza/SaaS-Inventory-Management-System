import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

import { Company } from '../schemas/company.schema';
import { getModelToken } from '@nestjs/mongoose';
import { MasterIndustry } from '../schemas/master-industry.schema';
import { MasterCategory } from '../schemas/master-category.schema';
import { TenantConnectionService } from '../database/tenant-connection.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const companyModel = app.get(getModelToken(Company.name));
  const masterIndustryModel = app.get(getModelToken(MasterIndustry.name));
  const masterCategoryModel = app.get(getModelToken(MasterCategory.name));
  const tenantConnectionService = app.get(TenantConnectionService);

  console.log('🌱 Starting General Category Migration/Fallback...');

  // Setup 'General' in Master DB if it doesn't exist
  await masterIndustryModel.updateOne(
    { industryId: 'general' },
    { $set: { industryName: 'General Storage', description: 'Fallback industry for non-specified accounts.', status: 'active' } },
    { upsert: true }
  );

  await masterCategoryModel.updateOne(
    { categoryId: 'cat_general' },
    { $set: { industryId: 'general', categoryName: 'General Items', supportsVariants: false, status: 'active' } },
    { upsert: true }
  );

  const companies = await companyModel.find();
  for (const company of companies) {
    if (!company.databaseName) continue;
    
    console.log(`Checking company: ${company.databaseName}`);
    const conn = await tenantConnectionService.getConnection(company.databaseName);
    const CategoryModel = conn.model('Category');
    const CompanyIndustryModel = conn.model('CompanyIndustry');

    // Check if industry mapping exists
    const industryMapping = await CompanyIndustryModel.findOne({ companyId: company._id });
    if (!industryMapping) {
      console.log(` -> No industry bound to ${company.name}, assigning 'general'.`);
      await CompanyIndustryModel.create({
        companyId: company._id,
        industryId: 'general',
        isActive: true,
      });

      // Insert the fallback category
      await CategoryModel.updateOne(
        { masterCategoryId: 'cat_general' },
        { $setOnInsert: {
            companyId: company._id,
            name: 'General Items',
            description: 'Uncategorized items',
            isCustomCategory: false,
            isActive: true,
        }},
        { upsert: true }
      );
    }
  }

  console.log('🚀 Migration complete. Exiting.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error during migration:', err);
  process.exit(1);
});
