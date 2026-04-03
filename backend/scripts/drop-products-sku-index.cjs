const mongoose = require('mongoose');

async function dropIndex(uri, dbName) {
  const url = `${uri}/${dbName}`;
  try {
    await mongoose.connect(url);
    console.log(`Connected to ${dbName}`);
    
    // Check if index exists on products collection
    const indices = await mongoose.connection.collection('products').listIndexes().toArray();
    const skuIndex = indices.find(idx => idx.name === 'companyId_1_sku_1');
    
    if (skuIndex) {
      console.log(`  Dropping index companyId_1_sku_1 from products in ${dbName}...`);
      await mongoose.connection.collection('products').dropIndex('companyId_1_sku_1');
      console.log('  Index dropped successfully.');
    } else {
      console.log(`  Index companyId_1_sku_1 not found in ${dbName}, skipping.`);
    }
  } catch (err) {
    console.error(`  Error in ${dbName}:`, err.message);
  } finally {
    await mongoose.disconnect();
  }
}

async function run() {
  const masterUri = 'mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net';
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(`${masterUri}/saas_master`);
  
  let dbNames = ['inv_techni_cmp002', 'inv_techno_cmp001'];
  
  try {
    await client.connect();
    const db = client.db('saas_master');
    const companies = await db.collection('companies').find({}).toArray();
    const fetchedNames = companies.map(c => c.schema).filter(Boolean);
    if (fetchedNames.length > 0) {
      dbNames = Array.from(new Set([...dbNames, ...fetchedNames]));
    }
  } catch (err) {
    console.error('Master DB fetch failed, using fallbacks:', err.message);
  } finally {
    await client.close();
  }
  
  for (const db of dbNames) {
    await dropIndex(masterUri, db);
  }
  
  process.exit(0);
}

run();
