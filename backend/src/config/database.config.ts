import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Base cluster URI (no database name) — dynamic per-tenant DBs are appended at runtime
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  // The master database name — used by the root MongooseModule connection
  masterDbName: process.env.MASTER_DB_NAME || 'saas_master',
}));
