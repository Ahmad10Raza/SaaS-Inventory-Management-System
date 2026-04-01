const mongoose = require("mongoose");
async function test() {
  try {
    const conn = await mongoose.createConnection("mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net/testdb_mongoose").asPromise();
    const { TENANT_MODELS } = require("./dist/database/tenant-models.js");
    for (const model of TENANT_MODELS) {
      if (!conn.modelNames().includes(model.name)) {
        console.log("Registering:", model.name);
        conn.model(model.name, model.schema);
      }
    }
    console.log("SUCCESS!");
    process.exit(0);
  } catch(e) {
    console.error("CRASH:", e);
    process.exit(1);
  }
}
test();
