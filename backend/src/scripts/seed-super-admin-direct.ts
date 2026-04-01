import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function seed() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';
  const tenantDbName = 'inventory_saas_system_admin';
  const adminEmail = 'admin@saas.com';
  const adminPassword = 'SuperAdmin2026!';

  try {
    await client.connect();
    const masterDb = client.db(masterDbName);
    const tenantDb = client.db(tenantDbName);

    console.log('--- Super Admin Direct Seeding ---');

    // 1. Create Company in Master DB
    const company = {
      companyId: 'CMP000',
      tenantId: 'TENANT-SYSTEM-ADMIN',
      databaseName: tenantDbName,
      name: 'SaaS System Admin',
      slug: 'saas-system-admin',
      industry: 'Platform Management',
      subscriptionPlan: 'premium',
      isActive: true,
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await masterDb.collection('companies').updateOne(
      { slug: company.slug },
      { $set: company },
      { upsert: true }
    );
    const savedCompany = await masterDb.collection('companies').findOne({ slug: company.slug });
    console.log('✅ Company record upserted in Master DB');

    // 2. Create User in Tenant DB
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const user = {
      companyId: savedCompany._id,
      firstName: 'SaaS',
      lastName: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
      hasSeenTour: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenantDb.collection('users').updateOne(
      { email: adminEmail },
      { $set: user },
      { upsert: true }
    );
    console.log('👑 Admin user upserted in Tenant DB!');

    // 3. Seed Basic Roles for System Tenant
    await tenantDb.collection('roles').updateOne(
      { name: 'super_admin' },
      { $set: { name: 'super_admin', displayName: 'Super Admin', permissions: ['*'], isSystem: true, companyId: savedCompany._id } },
      { upsert: true }
    );

    console.log(`\n🎉 SUCCESS! You can now log in.\n\nURL: http://localhost:5173/login\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n`);

  } finally {
    await client.close();
  }
}

seed().catch(console.error);
