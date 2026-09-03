import fs from 'node:fs';
const required = ['index.html','assets/app.js','assets/styles.css','config/portals.json','netlify/functions/audit.mjs','netlify/functions/approve.mjs','netlify/functions/github-apply.mjs'];
let ok = true;
for (const file of required) {
  if (!fs.existsSync(new URL('../'+file, import.meta.url))) { console.error('Missing:', file); ok = false; }
}
JSON.parse(fs.readFileSync(new URL('../config/portals.json', import.meta.url)));
console.log(ok ? 'Octon project check: OK' : 'Octon project check: FAILED');
process.exit(ok ? 0 : 1);
