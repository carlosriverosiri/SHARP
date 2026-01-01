const fs = require('fs');

const XML_PATH = process.argv[2] || 'C:\\Users\\carlo\\Dropbox\\00-Illustrationer\\AC-LED\\ASTRO\\sdermalmsortopedi.WordPress.2025-12-17.xml';

console.log(`\nLäser: ${XML_PATH}\n`);

const xml = fs.readFileSync(XML_PATH, 'utf-8');

// Hitta alla kategorier
const catRegex = /nicename="([^"]+)"/g;
const categories = {};
let match;

while ((match = catRegex.exec(xml)) !== null) {
  const cat = match[1];
  categories[cat] = (categories[cat] || 0) + 1;
}

// Sortera efter antal
const sorted = Object.entries(categories)
  .sort((a, b) => b[1] - a[1]);

console.log('Kategorier (sorterade efter antal poster):\n');
console.log('Antal  |  Kategori');
console.log('-------|----------');
sorted.forEach(([cat, count]) => {
  console.log(`  ${count.toString().padStart(3)}  |  ${cat}`);
});

console.log(`\nTotalt ${sorted.length} kategorier\n`);









