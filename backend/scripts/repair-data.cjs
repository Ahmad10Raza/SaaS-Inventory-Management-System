const mongoose = require('mongoose');

async function repair(dbName) {
  const url = `mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net/${dbName}`;
  await mongoose.connect(url);
  console.log(`Connected to ${dbName}`);
  
  const collections = ['products', 'product_variants', 'warehouse_stock', 'stock_movements', 'sales', 'purchases', 'invoices', 'categories', 'vendors', 'customers', 'warehouses'];
  
  for (const colName of collections) {
    const col = mongoose.connection.collection(colName);
    const cursor = col.find({});
    
    console.log(`Processing ${colName}...`);
    let count = 0;
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const updates = {};
      let changed = false;
      
      // Fields to check for string-to-ObjectId conversion
      const idFields = ['companyId', 'productId', 'variantId', 'warehouseId', 'customerId', 'vendorId', 'categoryId', 'parentId', 'referenceId', 'createdBy'];
      
      idFields.forEach(field => {
        if (doc[field] && typeof doc[field] === 'string' && doc[field].length === 24) {
          try {
            updates[field] = new mongoose.Types.ObjectId(doc[field]);
            changed = true;
          } catch (e) {
            // Not a valid ObjectId string, skip
          }
        }
      });
      
      // Also check nested items (for Sales/Purchases)
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
             console.log(`  Merging duplicate stock for ${updates.variantId}...`);
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
            console.log(`  Duplicate link found during conversion in ${colName}, skip or merge.`);
          } else throw e;
        }
      }
    }
    console.log(`  Updated ${count} documents in ${colName}`);
  }
  
  await mongoose.disconnect();
  console.log(`Finished ${dbName}\n`);
}

async function run() {
  // You can list all tenant DBs here or run for specific ones
  const tenants = ['inv_techni_cmp002']; 
  for (const t of tenants) {
    await repair(t);
  }
  process.exit(0);
}

run();
