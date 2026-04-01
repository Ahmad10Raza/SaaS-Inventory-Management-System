import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function listIds() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';

  try {
    await client.connect();
    const db = client.db(masterDbName);
    const companies = await db.collection('companies').find({}).toArray();
    
    console.log('--- Company IDs in Master DB ---');
    companies.forEach(c => console.log(`- ${c.companyId} (${c.name})`));
    console.log(`Total: ${companies.length}`);

  } finally {
    await client.close();
  }
}

listIds().catch(console.error);
