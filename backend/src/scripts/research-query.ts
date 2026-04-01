import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Company } from '../schemas/company.schema';

async function research() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // @ts-ignore
  const companyModel = app.get(getModelToken(Company.name));
  
  console.log('--- NestJS Context Query ---');
  const count = await companyModel.countDocuments();
  console.log('COMPANY COUNT:', count);
  
  const all = await companyModel.find({}).limit(5).lean();
  console.log('FIRST 5:', JSON.stringify(all, null, 2));
  
  await app.close();
}

research().catch(console.error);
