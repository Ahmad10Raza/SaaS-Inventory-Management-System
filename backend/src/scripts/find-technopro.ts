import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function findTechno() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';

  try {
    await client.connect();
    const db = client.db(masterDbName);
    const company = await db.collection('companies').findOne({ companyId: 'CMP021' });
    
    console.log('--- TechnoPro Record ---');
    console.log(JSON.stringify(company, null, 2));

  } finally {
    await client.close();
  }
}

findTechno().catch(console.error);
