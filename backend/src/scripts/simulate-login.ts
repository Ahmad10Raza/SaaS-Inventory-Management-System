import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function simulateLogin() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';
  const email = 'mr.hacker11410814@gmail.com';

  try {
    await client.connect();
    const masterDb = client.db(masterDbName);
    
    console.log(`--- Simulating Login for: ${email} ---`);
    const companies = await masterDb.collection('companies').find({ isActive: true }).toArray();
    console.log(`Found ${companies.length} active companies to check.`);

    let found = false;
    for (const company of companies) {
      if (!company.databaseName) continue;
      
      process.stdout.write(`Checking ${company.databaseName}... `);
      const tenantDb = client.db(company.databaseName);
      const user = await tenantDb.collection('users').findOne({ email: email.toLowerCase() });
      
      if (user) {
        console.log('✅ FOUND!');
        found = true;
        break;
      } else {
        console.log('❌');
      }
    }

    if (!found) {
      console.log('\n❌ USER NOT FOUND IN ANY TENANT DB');
    }

  } finally {
    await client.close();
  }
}

simulateLogin().catch(console.error);
