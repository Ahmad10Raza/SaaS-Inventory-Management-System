const mongoose = require('mongoose');

async function repair(uri, dbName) {
  const url = `${uri}/${dbName}`;
  await mongoose.connect(url);
  console.log(`Connected to ${dbName}`);
  
  const collections = ['products', 'product_variants', 'warehouse_stock', 'stock_movements', 'sales', 'purchases', 'invoices', 'categories', 'vendors', 'customers', 'warehouses'];
  
  for (const colName of collections) {
    const col = mongoose.connection.collection(colName);
    const cursor = col.find({});
    
    console.log(`  Processing ${colName}...`);
    let count = 0;
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const updates = {};
      let changed = false;
      
      const idFields = ['companyId', 'productId', 'variantId', 'warehouseId', 'customerId', 'vendorId', 'categoryId', 'parentId', 'referenceId', 'createdBy'];
      
      idFields.forEach(field => {
        if (doc[field] && typeof doc[field] === 'string' && doc[field].length === 24) {
          try {
            updates[field] = new mongoose.Types.ObjectId(doc[field]);
            changed = true;
          } catch (e) {}
        }
      });
      
      if (doc.items && Array.isArray(doc.items)) {
        const newItems = doc.items.map(item => {
          const newItem = { ...item };
          ['productId', 'variantId'].forEach(field => {
            if (item[field] && typeof item[field] === 'string' && item[field].length === 24) {
              newItem[field] = new mongoose.Types.ObjectId(item[field]);
              changed = true;
            }
          });
          return newItem;
        });
        if (changed) updates.items = newItems;
      }
      
      if (changed) {
        if (colName === 'warehouse_stock') {
          const existing = await col.findOne({ ...updates, _id: { $ne: doc._id } });
          if (existing) {
             console.log(`    Merging duplicate stock for ${updates.variantId}...`);
             await col.updateOne({ _id: existing._id }, { 
               $inc: { 
                 totalQuantity: doc.totalQuantity || 0,
                 availableQuantity: doc.availableQuantity || 0 
               } 
             });
             await col.deleteOne({ _id: doc._id });
             continue;
          }
        }
        try {
          await col.updateOne({ _id: doc._id }, { $set: updates });
          count++;
        } catch (e) {
          if (e.code === 11000) {
            console.log(`    Duplicate record for ${colName} during conversion, skip.`);
          } else throw e;
        }
      }
    }
    console.log(`    Updated ${count} docs`);
  }
  
  await mongoose.disconnect();
}

async function run() {
  const masterUri = 'mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net';
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(`${masterUri}/saas_master`);
  
  let dbNames = ['inv_techni_cmp002', 'inv_techno_cmp001'];
  
  try {
    await client.connect();
    console.log('Connected to master DB via Native Driver');
    const db = client.db('saas_master');
    const companies = await db.collection('companies').find({}).toArray();
    const fetchedNames = companies.map(c => c.schema).filter(Boolean);
    if (fetchedNames.length > 0) {
      dbNames = Array.from(new Set([...dbNames, ...fetchedNames]));
    }
    console.log(`Found ${dbNames.length} tenants to repair: ${dbNames.join(', ')}`);
  } catch (err) {
    console.error('Master DB fetch failed, using fallbacks:', err.message);
  } finally {
    await client.close();
  }
  
  for (const db of dbNames) {
    try {
      await repair(masterUri, db);
    } catch (err) {
      console.error(`Failed to repair ${db}:`, err.message);
    }
  }
  
  process.exit(0);
}

run();
