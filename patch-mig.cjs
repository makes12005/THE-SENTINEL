const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'apps/backend/src/db/migrations/0000_thin_johnny_storm.sql');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/"location" geometry\(Point, 4326\)/g, '"location" public.geometry(Point, 4326)');
content = content.replace(/"last_location" geometry\(Point, 4326\)/g, '"last_location" public.geometry(Point, 4326)');
fs.writeFileSync(file, content, 'utf8');

console.log('Migration patched');
