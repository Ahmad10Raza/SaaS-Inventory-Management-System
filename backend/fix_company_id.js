const fs = require('fs');
const glob = require('glob');

const files = glob.sync('/home/ahmad10raza/Documents/Major Projects/SaaS-Inventory-Management-System/backend/src/modules/**/*.service.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern: const filter: any = { companyId, isActive: true };
  if (content.includes('const filter: any = { companyId, isActive: true };')) {
    content = content.replace(
      'const filter: any = { companyId, isActive: true };',
      `const filter: any = { isActive: true };
    if (companyId) {
      const { Types } = require('mongoose');
      try { filter.companyId = new Types.ObjectId(companyId); } catch(e) { filter.companyId = companyId; }
    }`
    );
    changed = true;
  }

  // Also replace 'companyId' in findOne / remove directly
  // This might be tricky via regex, but standard pattern is:
  // findOne({ _id: id, companyId, isActive: true })
  const findOneRegex = /findOne\(\{\s*_id:\s*id,\s*companyId,\s*isActive:\s*true\s*\}\)/g;
  if (content.match(findOneRegex)) {
    content = content.replace(
      findOneRegex,
      `findOne({ _id: id, companyId: new (require('mongoose').Types.ObjectId)(companyId), isActive: true })`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
