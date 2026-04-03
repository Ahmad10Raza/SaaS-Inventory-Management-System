const mongoose = require('mongoose');

async function fix(dbName) {
  const url = `mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net/${dbName}`;
  await mongoose.connect(url);
  console.log(`Connected to ${dbName}`);
  
  const WarehouseStock = mongoose.connection.collection('warehouse_stock');
  const ProductVariants = mongoose.connection.collection('product_variants');
  
  const stocks = await WarehouseStock.find({}).toArray();
  console.log(`Processing ${stocks.length} stock records...`);
  
  let count = 0;
  for (const s of stocks) {
    if (!s.productId || !s.companyId) {
      const variant = await ProductVariants.findOne({ _id: s.variantId });
      if (variant) {
        await WarehouseStock.updateOne(
          { _id: s._id },
          { 
            $set: { 
              productId: variant.productId,
              companyId: variant.companyId
            } 
          }
        );
        count++;
      }
    }
  }
  
  console.log(`  Backfilled ${count} stock records in ${dbName}`);
  await mongoose.disconnect();
}

async function run() {
  const tenants = ['inv_techni_cmp002'];
  for (const t of tenants) {
    await fix(t);
  }
  process.exit(0);
}

run();
