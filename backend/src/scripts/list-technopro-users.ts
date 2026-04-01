import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function listUsers() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const tenantDbName = 'inventory_technopro_cmp021';

  try {
    await client.connect();
    const db = client.db(tenantDbName);
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`--- Users in ${tenantDbName} ---`);
    users.forEach(u => {
      console.log(`- Email: ${u.email}`);
      console.log(`  Name: ${u.firstName} ${u.lastName}`);
      console.log(`  Active: ${u.isActive}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Password Hash: ${u.password?.substring(0, 10)}...`);
    });

  } finally {
    await client.close();
  }
}

listUsers().catch(console.error);
