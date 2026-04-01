import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function fix() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';

  try {
    await client.connect();
    const db = client.db(masterDbName);
    
    console.log('--- Fixing SaaS System Admin Industry ---');
    
    // Update the industry to the valid enum 'platform_management' (lowercase)
    const result = await db.collection('companies').updateOne(
      { slug: 'saas-system-admin' },
      { $set: { industry: 'platform_management' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated SaaS System Admin industry to platform_management');
    } else {
      console.log('ℹ️ No update needed or company not found.');
    }

  } finally {
    await client.close();
  }
}

fix().catch(console.error);
