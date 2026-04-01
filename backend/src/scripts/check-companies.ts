import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function listCompanies() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MASTER_DB_NAME || 'saas_master');
    const companies = await db.collection('companies').find({}).toArray();
    console.log('--- Current Companies ---');
    console.log(JSON.stringify(companies, null, 2));
    console.log('-------------------------');
  } finally {
    await client.close();
  }
}

listCompanies().catch(console.error);
