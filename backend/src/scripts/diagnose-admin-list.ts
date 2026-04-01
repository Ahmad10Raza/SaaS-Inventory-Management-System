import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminService } from '../modules/admin/admin.service';

async function diagnose() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);
  
  console.log('--- Diagnosing AdminService.listCompanies ---');
  
  // Test 1: No filters
  const result1 = await adminService.listCompanies({});
  console.log('Result (No Filters) - Total:', result1.total);
  
  // Test 2: Empty search
  const result2 = await adminService.listCompanies({ search: '' });
  console.log('Result (Empty Search) - Total:', result2.total);

  // Test 3: Raw Model Query
  const companyModel = (adminService as any).companyModel;
  const count = await companyModel.countDocuments({});
  console.log('Raw Model Count:', count);

  await app.close();
}

diagnose().catch(console.error);
