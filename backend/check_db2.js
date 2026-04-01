const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net/inventory_company_cmp007";
const client = new MongoClient(uri);
async function run() {
  await client.connect();
  const db = client.db("inventory_company_cmp007");
  const users = await db.collection("users").find({}).toArray();
  console.log("Users:", JSON.stringify(users, null, 2));
  await client.close();
}
run();
