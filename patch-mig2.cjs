const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'apps/backend/src/db/migrations/0000_thin_johnny_storm.sql');
let content = fs.readFileSync(file, 'utf8');

// Replace all geometry(...) occurrences regardless of the prefix
content = content.replace(/geometry\(Point, 4326\)/g, 'public.geometry(Point, 4326)');

// In case the script was partially successful and added public.public.
content = content.replace(/public\.public\.geometry/g, 'public.geometry');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed geometry in SQL file.');
