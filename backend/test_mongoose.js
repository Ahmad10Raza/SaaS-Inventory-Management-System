const mongoose = require("mongoose");
const { Schema } = mongoose;
async function run() {
  const conn = await mongoose.createConnection("mongodb+srv://mrhacker11410814_db_user:Jp69C3LcNrmJ61ab@cluster0.bosftkn.mongodb.net/testdb_mongoose").asPromise();
  const UserSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, required: true },
    firstName: String,
  }, { timestamps: true });
  const UserModel = conn.model("User", UserSchema);
  const company_id = new mongoose.Types.ObjectId();
  const u = await UserModel.create({ companyId: company_id, firstName: "Test" });
  console.log("Created user:", u.toObject());
  const raw = await conn.db.collection("users").findOne({ _id: u._id });
  console.log("Raw mongo:", raw);
  await conn.close();
}
run();
