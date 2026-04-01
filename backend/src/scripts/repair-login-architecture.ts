import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function repair() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  const masterDbName = process.env.MASTER_DB_NAME || 'saas_master';

  try {
    await client.connect();
    const masterDb = client.db(masterDbName);
    
    console.log('--- Database Repair & Architecture Upgrade ---');
    
    // 1. Fix "Too Long" DB names (CMP017)
    const longNameComp = await masterDb.collection('companies').findOne({ companyId: 'CMP017' });
    if (longNameComp && longNameComp.databaseName.length > 38) {
      console.log(`Fixing databaseName for ${longNameComp.name}...`);
      await masterDb.collection('companies').updateOne(
        { _id: longNameComp._id },
        { $set: { databaseName: 'inv_master_log_cmp017' } }
      );
      console.log('✅ CMP017 database name shortened to 24 chars.');
    }

    // 2. Populate ownerEmail for TechnoPro (CMP021)
    const technoEmail = 'mr.hacker11410814@gmail.com';
    const technoResult = await masterDb.collection('companies').updateOne(
      { slug: 'technopro' },
      { $set: { ownerEmail: technoEmail.toLowerCase() } }
    );
    if (technoResult.modifiedCount > 0) {
      console.log(`✅ TechnoPro Master DB record updated with ownerEmail: ${technoEmail}`);
    }

    // 3. Set isTemporaryPassword for TechnoPro Admin in Tenant DB
    const technoDbName = 'inventory_technopro_cmp021';
    const technoDb = client.db(technoDbName);
    const userResult = await technoDb.collection('users').updateOne(
      { email: technoEmail.toLowerCase() },
      { $set: { isTemporaryPassword: true } }
    );
    if (userResult.modifiedCount > 0) {
       console.log(`✅ TechnoPro Admin User updated with isTemporaryPassword: true`);
    }

    // 4. Populate ownerEmail for System Admin (CMP000)
    await masterDb.collection('companies').updateOne(
      { companyId: 'CMP000' },
      { $set: { ownerEmail: 'admin@saas.com' } }
    );
    console.log('✅ System Admin ownerEmail set for instant login.');

  } finally {
    await client.close();
  }
}

repair().catch(console.error);
