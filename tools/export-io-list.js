// Extracts the plant model from the HMI file and writes the I/O list as CSV.
// Usage: node tools/export-io-list.js > docs/villa-somalia-io-list.csv
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../hmi/villa-somalia-scada.html'), 'utf8');
const src = html.match(/<script id="plant-model">([\s\S]*?)<\/script>/)[1];
const ctx = { module: { exports: {} } };
vm.runInNewContext(src, ctx);
const { buildIO } = ctx.module.exports;
const q = s => `"${String(s).replace(/"/g, '""')}"`;
const rows = buildIO();
console.log('Tag,Area,Equipment,Description,Type,Source,Protocol,Unit,Alarm');
rows.forEach(r => console.log([r.tag, r.area, r.eq, r.desc, r.type, r.src, r.proto, r.unit, r.alarm].map(q).join(',')));
