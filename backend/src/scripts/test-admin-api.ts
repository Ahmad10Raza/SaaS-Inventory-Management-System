import { MongoClient } from 'mongodb';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

async function testAdminApi() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri = process.env.MONGODB_URI;
  const secret = process.env.JWT_SECRET || 'saas_inventory_jwt_secret_key_2026_super_secure';

  const client = new MongoClient(uri!);
  try {
    await client.connect();
    const masterDb = client.db(process.env.MASTER_DB_NAME || 'saas_master');
    const company = await masterDb.collection('companies').findOne({ slug: 'saas-system-admin' });
    
    if (!company) {
      console.log('Company saas-system-admin not found!');
      return;
    }

    const tenantDb = client.db(company.databaseName);
    const user = await tenantDb.collection('users').findOne({ email: 'admin@saas.com' });
    
    if (!user) {
      console.log('User admin@saas.com not found!');
      return;
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      companyId: company._id.toString(),
      tenantDbName: company.databaseName,
      role: user.role,
    };
    
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    console.log('TOKEN GENERATED SUCCESS');
    
    try {
      const response = await axios.get('http://localhost:3001/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('API SUCCESS. TOTAL:', response.data.total);
    } catch (apiErr) {
      console.error('API ERROR:', apiErr.response?.data || apiErr.message);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.close();
  }
}

testAdminApi().catch(console.error);
