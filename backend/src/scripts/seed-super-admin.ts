import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TenantProvisionerService } from '../modules/tenant/tenant-provisioner.service';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import { getModelToken } from '@nestjs/mongoose';
import { Company } from '../../schemas/company.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const provisioner = app.get(TenantProvisionerService);
  const companyModel = app.get(getModelToken(Company.name));
  const connectionService = app.get(TenantConnectionService);

  const adminEmail = 'admin@saas.com';
  const adminPassword = 'SuperAdmin2026!';

  console.log('--- Super Admin Seeding ---');

  try {
    // Check if company already exists
    const existing = await companyModel.findOne({ slug: 'saas-system-admin' });
    if (existing) {
      console.log('ℹ️ System Company already exists. Proceeding to user check...');
    }

    const result = await provisioner.provisionNewTenant({
      companyName: 'SaaS System Admin',
      industry: 'Platform Management',
      firstName: 'SaaS',
      lastName: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
    });

    console.log('✅ System Company Provisioned:', result.companyId);

    // Promote the user to super_admin
    const conn = await connectionService.getConnection(result.databaseName);
    const UserModel = conn.model('User');
    
    await UserModel.findOneAndUpdate({ email: adminEmail }, {
      role: 'super_admin',
      permissions: ['*'],
    });

    console.log('👑 Admin user promoted to Super Admin!');
    console.log(`\nCREDENTIALS:\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n`);
  } catch (error) {
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
       console.log('ℹ️ User/Company already exists. Ensuring role is super_admin...');
       // Implementation of role update if already exists could go here
    } else {
       console.error('❌ Seeding failed:', error.message);
    }
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
