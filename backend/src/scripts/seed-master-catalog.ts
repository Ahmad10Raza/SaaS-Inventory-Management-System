import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { MasterIndustry } from '../schemas/master-industry.schema';
import { MasterCategory } from '../schemas/master-category.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const masterIndustryModel = app.get(getModelToken(MasterIndustry.name));
  const masterCategoryModel = app.get(getModelToken(MasterCategory.name));

  console.log('🌱 Starting Master Catalog Seeding...');

  // 1. Wipe existing Master records
  await masterIndustryModel.deleteMany({});
  await masterCategoryModel.deleteMany({});
  console.log('🧹 Purged existing master records.');

  // 2. Define Industries
  const industries = [
    { industryId: 'electronics', industryName: 'Electronics & Mobile', description: 'Gadgets, appliances, computing.', icon: 'Laptop', status: 'active' },
    { industryId: 'pharmacy', industryName: 'Pharmacy & Healthcare', description: 'Medicines, surgical tools.', icon: 'Pill', status: 'active' },
    { industryId: 'iron_factory', industryName: 'Iron Factory', description: 'Metals, sheets, hardware.', icon: 'Factory', status: 'active' },
    { industryId: 'clothing', industryName: 'Clothing & Apparel', description: 'Garments, shoes, accessories.', icon: 'Shirt', status: 'active' },
  ];
  await masterIndustryModel.insertMany(industries);
  console.log('✅ Seeded 4 Master Industries.');

  // 3. Define Standard Categories
  const categories = [
    // Electronics
    { categoryId: 'cat_mobile', industryId: 'electronics', categoryName: 'Mobile Phones', supportsVariants: true, supportsSerialTracking: true, status: 'active' },
    { categoryId: 'cat_laptop', industryId: 'electronics', categoryName: 'Laptops & Computers', supportsVariants: true, supportsSerialTracking: true, status: 'active' },
    { categoryId: 'cat_charger', industryId: 'electronics', categoryName: 'Chargers & Cables', supportsVariants: false, supportsSerialTracking: false, status: 'active' },

    // Pharmacy
    { categoryId: 'cat_syrup', industryId: 'pharmacy', categoryName: 'Syrups & Liquids', supportsBatchTracking: true, supportsExpiryTracking: true, status: 'active' },
    { categoryId: 'cat_tablet', industryId: 'pharmacy', categoryName: 'Tablets & Capsules', supportsBatchTracking: true, supportsExpiryTracking: true, status: 'active' },
    { categoryId: 'cat_surgical', industryId: 'pharmacy', categoryName: 'Surgical Equipments', supportsSerialTracking: true, supportsBatchTracking: true, status: 'active' },

    // Iron Factory
    { categoryId: 'cat_iron_rod', industryId: 'iron_factory', categoryName: 'Iron Rods (TMT)', supportsManufacturing: true, supportsVariants: true, status: 'active' },
    { categoryId: 'cat_iron_sheet', industryId: 'iron_factory', categoryName: 'Iron Sheets', supportsManufacturing: true, supportsVariants: true, status: 'active' },

    // Clothing
    { categoryId: 'cat_tshirt', industryId: 'clothing', categoryName: 'T-Shirts', supportsVariants: true, status: 'active' },
    { categoryId: 'cat_jeans', industryId: 'clothing', categoryName: 'Jeans & Trousers', supportsVariants: true, status: 'active' },
    { categoryId: 'cat_shoes', industryId: 'clothing', categoryName: 'Shoes & Footwear', supportsVariants: true, status: 'active' },
  ];
  await masterCategoryModel.insertMany(categories);
  console.log(`✅ Seeded ${categories.length} Master Categories.`);

  console.log('🚀 Seed complete. Exiting.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
