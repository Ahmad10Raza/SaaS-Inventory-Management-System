import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function checkUser() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const tenantDbName = 'inventory_technopro_cmp021';
  const email = 'mr.hacker11410814@gmail.com';

  try {
    await client.connect();
    const db = client.db(tenantDbName);
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log(`✅ User found in ${tenantDbName}:`);
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log(`❌ User NOT found in ${tenantDbName}`);
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('All users in this DB:', allUsers.map(u => u.email));
    }

  } finally {
    await client.close();
  }
}

checkUser().catch(console.error);
